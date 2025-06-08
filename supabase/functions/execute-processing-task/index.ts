import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts"

// No timeout limits - this function can run as long as needed
const FETCH_TIMEOUT = 10 * 1000; // 10 seconds for individual fetch operations

// Helper function to create timeout promise
function createTimeoutPromise<T>(ms: number, errorMessage: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
}

interface Article {
  title: string;
  link: string;
  publishedDate: string;
  description?: string;
  content?: string;
}

interface ContentDetectionResult {
  isRSS: boolean;
  contentType: string;
  content: string;
  responseStatus: number;
}

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { task_id } = await req.json()
    
    if (!task_id) {
      throw new Error('task_id is required')
    }

    // Use service role key for unrestricted access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('🔄 Starting execution of task:', task_id)

    // Get task details
    const { data: task, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .select('*')
      .eq('id', task_id)
      .single()

    if (taskError || !task) {
      throw new Error(`Task not found: ${taskError?.message}`)
    }

    // Update task status to running
    await supabaseClient
      .from('processing_tasks')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', task_id)

    // Get user's sources
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('content_sources')
      .select('*')
      .eq('user_id', task.user_id)
      .eq('is_active', true)

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    const processedSources: any[] = []
    const skippedSources: any[] = []
    let totalSummaries = 0

    // Process each source without any timeout pressure
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]
      
      try {
        console.log(`🔄 Processing source (${i + 1}/${sources.length}):`, source.name)
        
        // Update progress
        await supabaseClient
          .from('processing_tasks')
          .update({
            progress: {
              current: i + 1,
              total: sources.length,
              processed_sources: processedSources,
              skipped_sources: skippedSources,
              current_source: source.name
            }
          })
          .eq('id', task_id)

        // Detect content type
        const detection = await detectContentType(source.url)
        
        if (!detection) {
          skippedSources.push({
            name: source.name,
            reason: '无法访问该URL'
          })
          continue
        }

        let result
        if (detection.isRSS) {
          console.log('📡 Processing as RSS feed')
          result = await processAsRSS(supabaseClient, source.id, source.url, source.name, detection.content)
        } else {
          console.log('🌐 Processing as webpage')
          result = await processAsWebPage(supabaseClient, source.id, source.url, source.name, detection.content)
        }

        if (result.success) {
          processedSources.push({
            name: source.name,
            articlesCount: result.articlesCount,
            summariesCount: result.summariesCount,
            type: result.type
          })
          totalSummaries += result.summariesCount

          // Update source success status
          await supabaseClient
            .from('content_sources')
            .update({ 
              last_scraped_at: new Date().toISOString(),
              error_count: 0,
              last_error: null
            })
            .eq('id', source.id)
        } else {
          skippedSources.push({
            name: source.name,
            reason: result.error || '处理失败'
          })

          // Update source error status
          await supabaseClient
            .from('content_sources')
            .update({ 
              error_count: source.error_count + 1,
              last_error: result.error || '未知错误'
            })
            .eq('id', source.id)
        }

      } catch (error) {
        console.error('❌ Failed to process source:', source.name, error)
        skippedSources.push({
          name: source.name,
          reason: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    // Generate digest if we have summaries
    if (totalSummaries > 0) {
      await generateDigestFromSummaries(supabaseClient, task.user_id)
    }

    // Mark task as completed
    const finalResult = {
      processedSources,
      skippedSources,
      totalSummaries
    }

    await supabaseClient
      .from('processing_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: finalResult,
        progress: {
          current: sources.length,
          total: sources.length,
          processed_sources: processedSources,
          skipped_sources: skippedSources,
          completed: true
        }
      })
      .eq('id', task_id)

    console.log('✅ Task completed successfully:', task_id)

    return new Response(
      JSON.stringify({ success: true, result: finalResult }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('❌ Task execution failed:', error)
    
    // Try to update task status to failed
    try {
      const { task_id } = await req.json()
      if (task_id) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )
        
        await supabaseClient
          .from('processing_tasks')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', task_id)
      }
    } catch (updateError) {
      console.error('Failed to update task status:', updateError)
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})

// All helper functions below...

async function detectContentType(url: string): Promise<ContentDetectionResult | null> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)',
    'Mozilla/5.0 (compatible; DigestBot/1.0; +https://example.com/bot)',
    'FeedParser/1.0'
  ]

  for (const userAgent of userAgents) {
    try {
      console.log(`🤖 Trying content detection with: ${userAgent}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status} with ${userAgent}`)
        continue
      }

      const contentType = response.headers.get('content-type') || ''
      const content = await response.text()
      
      console.log('📄 Content-Type:', contentType)
      console.log('📝 Content length:', content.length)

      const isRSS = isRSSContent(contentType, content)
      
      return {
        isRSS,
        contentType,
        content,
        responseStatus: response.status
      }

    } catch (error) {
      console.error(`❌ Detection failed with ${userAgent}:`, error)
      continue
    }
  }

  return null
}

function isRSSContent(contentType: string, content: string): boolean {
  if (contentType.includes('rss') || contentType.includes('atom') || contentType.includes('xml')) {
    console.log('✅ RSS detected by content-type')
    return true
  }

  const lowerContent = content.toLowerCase()
  
  if (lowerContent.includes('<rss') && lowerContent.includes('<channel')) {
    console.log('✅ RSS 2.0 detected by content analysis')
    return true
  }
  
  if (lowerContent.includes('<feed') && lowerContent.includes('xmlns="http://www.w3.org/2005/atom"')) {
    console.log('✅ Atom feed detected by content analysis')
    return true
  }
  
  if (lowerContent.includes('<rss') || (lowerContent.includes('<channel') && lowerContent.includes('<item'))) {
    console.log('✅ RSS detected by pattern matching')
    return true
  }

  console.log('❌ Not detected as RSS/Atom feed')
  return false
}

async function processAsRSS(
  supabaseClient: any,
  sourceId: number,
  feedUrl: string,
  sourceName: string,
  xmlContent: string
): Promise<{ success: boolean; articlesCount: number; summariesCount: number; error?: string; type: 'RSS' }> {
  try {
    console.log('📡 Processing as RSS feed:', sourceName)

    const articles = await parseRSSContent(xmlContent, feedUrl)
    
    if (!articles || articles.length === 0) {
      return {
        success: false,
        articlesCount: 0,
        summariesCount: 0,
        error: '未能从RSS feed中解析文章',
        type: 'RSS'
      }
    }

    console.log('📰 Parsed', articles.length, 'articles from RSS')
    
    return await processArticles(supabaseClient, sourceId, articles, 'RSS')

  } catch (error) {
    console.error('❌ RSS processing failed:', error)
    return {
      success: false,
      articlesCount: 0,
      summariesCount: 0,
      error: `RSS处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
      type: 'RSS'
    }
  }
}

async function processAsWebPage(
  supabaseClient: any,
  sourceId: number,
  pageUrl: string,
  sourceName: string,
  htmlContent: string
): Promise<{ success: boolean; articlesCount: number; summariesCount: number; error?: string; type: 'WebPage' }> {
  try {
    console.log('🌐 Processing as web page:', sourceName)

    const articles = await extractArticlesFromWebPage(htmlContent, pageUrl)
    
    if (!articles || articles.length === 0) {
      return {
        success: false,
        articlesCount: 0,
        summariesCount: 0,
        error: '未能从网页中提取文章内容',
        type: 'WebPage'
      }
    }

    console.log('📰 Extracted', articles.length, 'articles from webpage')
    
    return await processArticles(supabaseClient, sourceId, articles, 'WebPage')

  } catch (error) {
    console.error('❌ Web page processing failed:', error)
    return {
      success: false,
      articlesCount: 0,
      summariesCount: 0,
      error: `网页处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
      type: 'WebPage'
    }
  }
}

async function parseRSSContent(xmlContent: string, feedUrl: string): Promise<Article[]> {
  console.log('🔍 Starting RSS content parsing for:', feedUrl)
  
  try {
    const parser = new DOMParser()
    let doc: Document | null = null
    
    const mimeTypes = ['application/xml', 'text/html', 'application/xhtml+xml']
    
    for (const mimeType of mimeTypes) {
      try {
        doc = parser.parseFromString(xmlContent, mimeType as any)
        const parseErrors = doc.querySelectorAll('parsererror')
        if (parseErrors.length === 0) {
          console.log('✅ DOM parser succeeded')
          break
        } else {
          doc = null
        }
      } catch (error) {
        doc = null
      }
    }

    if (!doc) {
      console.log('🔄 Attempting regex parsing as fallback')
      return await parseRSSWithRegex(xmlContent)
    }

    const articles: Article[] = []
    const items = doc!.querySelectorAll('item')
    console.log('🔍 Found', items.length, 'RSS items via DOM')
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)  // Changed to 30 days
    
    if (items.length > 0) {
      items.forEach((item, index) => {
        const title = item.querySelector('title')?.textContent?.trim()
        
        // Try multiple ways to get the link
        let link = item.querySelector('link')?.textContent?.trim()
        if (!link) {
          // Try link as attribute (some RSS feeds use <link href="..."/>)
          link = item.querySelector('link')?.getAttribute('href')?.trim()
        }
        if (!link) {
          // Try guid as fallback
          link = item.querySelector('guid')?.textContent?.trim()
        }
        if (!link) {
          // Try enclosure url
          link = item.querySelector('enclosure')?.getAttribute('url')?.trim()
        }
        
        const pubDate = item.querySelector('pubDate')?.textContent?.trim()
        const description = item.querySelector('description')?.textContent?.trim()

        console.log(`🔍 Item ${index + 1} DEBUG:`)
        console.log(`  - Title: "${title}"`)
        console.log(`  - Link: "${link}"`)
        console.log(`  - PubDate: "${pubDate}"`)
        console.log(`  - Description length: ${description?.length || 0}`)

        if (title && link) {
          const articleDate = pubDate ? new Date(pubDate) : new Date()
          console.log(`📅 Article ${index + 1}: "${title}" - Date: ${pubDate} -> ${articleDate.toISOString()}`)
          
          if (articleDate >= thirtyDaysAgo) {
            articles.push({
              title,
              link,
              publishedDate: articleDate.toISOString(),
              description,
              content: description
            })
            console.log(`✅ Article ${index + 1} added to processing queue`)
          } else {
            console.log(`❌ Article ${index + 1} too old, skipping`)
          }
        } else {
          console.log(`❌ Item ${index + 1} SKIPPED: Missing title (${!!title}) or link (${!!link})`)
        }
      })
    } else {
      // Try Atom format
      const entries = doc!.querySelectorAll('entry')
      console.log('🔍 Found', entries.length, 'Atom entries via DOM')
      
      entries.forEach((entry, index) => {
        const title = entry.querySelector('title')?.textContent?.trim()
        const linkElement = entry.querySelector('link')
        const link = linkElement?.getAttribute('href') || linkElement?.textContent?.trim()
        const published = entry.querySelector('published')?.textContent?.trim() || 
                         entry.querySelector('updated')?.textContent?.trim()
        const summary = entry.querySelector('summary')?.textContent?.trim() ||
                       entry.querySelector('content')?.textContent?.trim()

        if (title && link) {
          const articleDate = published ? new Date(published) : new Date()
          console.log(`📅 Atom Entry ${index + 1}: "${title}" - Date: ${published} -> ${articleDate.toISOString()}`)
          
          if (articleDate >= thirtyDaysAgo) {
            articles.push({
              title,
              link,
              publishedDate: articleDate.toISOString(),
              description: summary,
              content: summary
            })
            console.log(`✅ Atom Entry ${index + 1} added to processing queue`)
          } else {
            console.log(`❌ Atom Entry ${index + 1} too old, skipping`)
          }
        }
      })
    }

    console.log('✅ Successfully parsed', articles.length, 'articles from RSS/Atom feed')
    return articles.slice(0, 20)

  } catch (error) {
    console.error('❌ RSS parsing failed:', error)
    return await parseRSSWithRegex(xmlContent)
  }
}

async function parseRSSWithRegex(xmlContent: string): Promise<Article[]> {
  console.log('🔄 Starting regex-based RSS parsing')
  
  const articles: Article[] = []
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)  // Changed to 30 days
  
  try {
    const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
    const items = Array.from(xmlContent.matchAll(itemRegex))
    
    console.log('🔍 Found', items.length, 'items via regex')
    
    for (let i = 0; i < Math.min(items.length, 20); i++) {
      const item = items[i]
      const itemContent = item[1]
      
      const titleMatch = itemContent.match(/<title(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)
      const title = titleMatch?.[1]?.trim()
      
      // Try multiple ways to get the link via regex
      const linkMatch = itemContent.match(/<link(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i)
      let link = linkMatch?.[1]?.trim()
      
      if (!link) {
        // Try link with href attribute
        const hrefMatch = itemContent.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
        link = hrefMatch?.[1]?.trim()
      }
      
      if (!link) {
        // Try guid as fallback
        const guidMatch = itemContent.match(/<guid(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/guid>/i)
        link = guidMatch?.[1]?.trim()
      }
      
      const pubDateMatch = itemContent.match(/<pubDate(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/i)
      const pubDateStr = pubDateMatch?.[1]?.trim()
      
      const descMatch = itemContent.match(/<description(?:\s[^>]*)?>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)
      const description = descMatch?.[1]?.trim()
      
      if (title && link) {
        const articleDate = pubDateStr ? new Date(pubDateStr) : new Date()
        console.log(`📅 Regex Item ${i + 1}: "${title}" - Date: ${pubDateStr} -> ${articleDate.toISOString()}`)
        
        if (articleDate >= thirtyDaysAgo) {
          articles.push({
            title: title.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
            link: link.replace(/&amp;/g, '&'),
            publishedDate: articleDate.toISOString(),
            description: description?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
            content: description?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
          })
          console.log(`✅ Regex Item ${i + 1} added to processing queue`)
        } else {
          console.log(`❌ Regex Item ${i + 1} too old, skipping`)
        }
      }
    }
    
    console.log('✅ Regex parsing completed, found', articles.length, 'valid articles')
    return articles
    
  } catch (error) {
    console.error('❌ Regex parsing failed:', error)
    return []
  }
}

async function extractArticlesFromWebPage(htmlContent: string, pageUrl: string): Promise<Article[]> {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    
    const contentSelectors = [
      'article', '.post-content', '.entry-content', '.article-content',
      '.content', 'main', '#content', '.main-content'
    ]
    
    let title = ''
    let content = ''
    
    const titleElement = doc.querySelector('h1') || doc.querySelector('title')
    title = titleElement?.textContent?.trim() || 'Untitled'
    
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector)
      if (element) {
        content = element.textContent?.trim() || ''
        if (content.length > 500) {
          break
        }
      }
    }
    
    if (!content || content.length < 100) {
      content = doc.querySelector('body')?.textContent?.trim() || ''
    }
    
    if (title && content && content.length > 100) {
      return [{
        title,
        link: pageUrl,
        publishedDate: new Date().toISOString(),
        description: content.substring(0, 500) + '...',
        content: content.length > 8000 ? content.substring(0, 8000) + '...' : content
      }]
    }
    
    return []
    
  } catch (error) {
    console.error('❌ Failed to extract articles from webpage:', error)
    return []
  }
}

async function processArticles(
  supabaseClient: any,
  sourceId: number,
  articles: Article[],
  sourceType: 'RSS' | 'WebPage'
): Promise<{ success: boolean; articlesCount: number; summariesCount: number; type: 'RSS' | 'WebPage' }> {
  let summariesCount = 0
  const maxArticles = sourceType === 'RSS' ? 20 : 1

  for (let i = 0; i < Math.min(articles.length, maxArticles); i++) {
    const article = articles[i]
    
    try {
      const { data: existingItem } = await supabaseClient
        .from('content_items')
        .select(`
          id,
          content_text,
          is_processed,
          summaries (
            id,
            summary_text
          )
        `)
        .eq('source_id', sourceId)
        .eq('content_url', article.link)
        .maybeSingle()

      if (existingItem) {
        console.log('🔍 Found duplicate article:', article.title)
        
        if (existingItem.summaries && existingItem.summaries.length > 0) {
          console.log('✅ Summary already exists, counting existing summary')
          summariesCount++
          continue
        }
        
        if (existingItem.content_text && existingItem.content_text.length > 100) {
          console.log('🤖 Generating missing summary for existing article')
          const summaryResult = await generateAISummary(
            supabaseClient,
            existingItem.id,
            existingItem.content_text,
            article.link
          )

          if (summaryResult.success) {
            summariesCount++
            
            await supabaseClient
              .from('content_items')
              .update({ is_processed: true })
              .eq('id', existingItem.id)
              
            console.log('✅ Successfully generated summary for existing article')
          }
        }
        continue
      }

      let fullContent = article.content || ''
      
      if (sourceType === 'RSS' && article.link && (!fullContent || fullContent.length < 500)) {
        try {
          console.log('🔗 Fetching full content for new RSS article:', article.link)
          const contentFetchPromise = fetchFullArticleContent(article.link)
          const timeoutPromise = createTimeoutPromise<string>(8000, 'Article content fetch timeout')
          fullContent = await Promise.race([contentFetchPromise, timeoutPromise])
          console.log('📄 Successfully fetched content, length:', fullContent.length)
        } catch (error) {
          console.log('⚠️ Could not fetch full content, using RSS description')
          fullContent = article.description || article.content || ''
        }
      }
      
      if (!fullContent || fullContent.length < 100) {
        console.log('⚠️ Article content too short, skipping:', article.title)
        continue
      }

      const { data: contentItem, error: itemError } = await supabaseClient
        .from('content_items')
        .insert({
          source_id: sourceId,
          title: article.title,
          content_url: article.link,
          content_text: fullContent,
          published_date: article.publishedDate,
          is_processed: false
        })
        .select()
        .single()

      if (itemError) {
        console.error('❌ Failed to create content_item:', itemError)
        continue
      }

      const summaryResult = await generateAISummary(
        supabaseClient,
        contentItem.id,
        fullContent,
        article.link
      )

      if (summaryResult.success) {
        summariesCount++
        
        await supabaseClient
          .from('content_items')
          .update({ is_processed: true })
          .eq('id', contentItem.id)
          
        console.log('✅ Successfully processed article:', article.title)
      }

    } catch (error) {
      console.error('❌ Failed to process article:', article.title, error)
      continue
    }
  }

  return {
    success: summariesCount > 0 || articles.length === 0,
    articlesCount: Math.min(articles.length, maxArticles),
    summariesCount,
    type: sourceType
  }
}

async function fetchFullArticleContent(articleUrl: string): Promise<string> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ]

  for (const userAgent of userAgents) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      
      const response = await fetch(articleUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
        },
        redirect: 'follow',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        continue
      }

      const html = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      const contentSelectors = [
        'article', '.post-content', '.entry-content', '.article-content',
        '.article-body', '.content', '.story-body', '.post-body',
        '.blog-content', '.main-content', 'main', '[data-testid="ArticleBody"]',
        '[data-testid="article-body"]', '.article__content', '.article__body',
        '.post__content', '.post__body', '.content-body', '.text-content',
        '.entry-body', '.story-content', '.article-text', '.post-text',
        '#content', '#main-content', '#article-content', '.wp-content',
        '.single-content', '.post-single-content'
      ]

      for (const selector of contentSelectors) {
        const element = doc.querySelector(selector)
        if (element) {
          let content = element.textContent?.trim() || ''
          content = content.replace(/\s+/g, ' ').trim()
          
          if (content.length > 500) {
            return content.length > 8000 ? content.substring(0, 8000) + '...' : content
          }
        }
      }

      const bodyText = doc.querySelector('body')?.textContent?.trim() || ''
      if (bodyText.length > 500) {
        return bodyText.length > 8000 ? bodyText.substring(0, 8000) + '...' : bodyText
      }

    } catch (error) {
      console.error(`❌ Failed to fetch with ${userAgent}:`, error)
      continue
    }
  }

  throw new Error('Could not fetch article content')
}

async function generateAISummary(
  supabaseClient: any,
  contentItemId: number,
  content: string,
  originalUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🤖 Checking for existing summary for content item:', contentItemId)

    const { data: existingSummary } = await supabaseClient
      .from('summaries')
      .select('id, summary_text')
      .eq('content_item_id', contentItemId)
      .maybeSingle()

    if (existingSummary) {
      console.log('✅ Summary already exists, skipping DeepSeek API call')
      return { success: true }
    }

    console.log('🤖 No existing summary found, generating new one with DeepSeek API')

    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set')
    }

    const truncatedContent = content.length > 6000 ? content.substring(0, 6000) + '...' : content

    const summary = await callDeepSeekAPI(truncatedContent, apiKey)

    if (!summary) {
      throw new Error('No summary generated from DeepSeek API')
    }

    const { error: summaryError } = await supabaseClient
      .from('summaries')
      .insert({
        content_item_id: contentItemId,
        summary_text: summary,
        model_used: 'deepseek'
      })

    if (summaryError) {
      throw new Error(`Failed to store summary: ${summaryError.message}`)
    }

    console.log('✅ Successfully generated and stored new AI summary')
    return { success: true }

  } catch (error) {
    console.error('❌ AI summary generation failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function callDeepSeekAPI(content: string, apiKey: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a professional content analysis assistant. Please summarize the article into 3-5 main themes. For each theme, provide 3-5 sentences of explanation and include 1 direct quote from the original article. Format your response with clear theme headers and use Chinese for the explanations.'
          },
          {
            role: 'user',
            content: `Please analyze the following article content and provide a structured summary:\n\n${content}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from DeepSeek API')
    }

    return data.choices[0].message.content.trim()
  } finally {
    clearTimeout(timeoutId)
  }
}

async function generateDigestFromSummaries(supabaseClient: any, userId: string): Promise<void> {
  try {
    console.log('📝 Generating digest from summaries for user:', userId)

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: summaries, error: summariesError } = await supabaseClient
      .from('summaries')
      .select(`
        id,
        summary_text,
        created_at,
        content_items!inner (
          title,
          content_url,
          published_date,
          content_sources!inner (
            name,
            user_id
          )
        )
      `)
      .gte('created_at', oneWeekAgo)
      .eq('content_items.content_sources.user_id', userId)
      .order('created_at', { ascending: false })

    if (summariesError || !summaries || summaries.length === 0) {
      console.log('No recent summaries found for digest generation')
      return
    }

    const digestTitle = `Weekly Digest - ${new Date().toLocaleDateString('zh-CN')}`
    const digestContent = `# ${digestTitle}\n\n` + 
      summaries.map((summary: any) => {
        const publishedDate = summary.content_items.published_date ? 
          new Date(summary.content_items.published_date).toLocaleDateString('zh-CN') : 
          '未知日期'
        const sourceName = summary.content_items.content_sources.name
        
        return `## ${summary.content_items.title}\n\n**来源**: ${sourceName} | **发布**: ${publishedDate}\n\n${summary.summary_text}\n\n[阅读原文](${summary.content_items.content_url})\n\n---\n`
      }).join('\n')

    const { error: digestError } = await supabaseClient
      .from('digests')
      .insert({
        user_id: userId,
        title: digestTitle,
        content: digestContent,
        digest_type: 'weekly'
      })

    if (digestError) {
      console.error('❌ Failed to create digest:', digestError)
    } else {
      console.log('✅ Successfully created digest')
    }

  } catch (error) {
    console.error('❌ Digest generation failed:', error)
  }
} 