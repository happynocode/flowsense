// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts"

interface ProcessedSource {
  name: string;
  articlesCount: number;
  summariesCount: number;
  type: 'RSS' | 'WebPage';
}

interface SkippedSource {
  name: string;
  reason: string;
}

interface Article {
  title: string;
  link: string;
  publishedDate: string;
  description?: string;
  content?: string;
}

interface ProcessResult {
  success: boolean;
  data?: {
    processedSources: ProcessedSource[];
    skippedSources: SkippedSource[];
    totalSummaries: number;
  };
  error?: string;
}

interface ContentDetectionResult {
  isRSS: boolean;
  contentType: string;
  content: string;
  responseStatus: number;
}

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Authentication required')
    }

    console.log('🚀 Starting intelligent content processing for user:', user.id)

    // Get all active content sources for the user
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('content_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            processedSources: [],
            skippedSources: [],
            totalSummaries: 0
          }
        } as ProcessResult),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    console.log('📊 Found', sources.length, 'active sources')

    const processedSources: ProcessedSource[] = []
    const skippedSources: SkippedSource[] = []
    let totalSummaries = 0

    // Process each source intelligently
    for (const source of sources) {
      try {
        console.log('🔄 Processing source:', source.name, '|', source.url)
        
        // Step 1: Intelligent content detection
        const detection = await detectContentType(source.url)
        
        if (!detection) {
          skippedSources.push({
            name: source.name,
            reason: '无法访问该URL'
          })
          continue
        }

        let result: { success: boolean; articlesCount: number; summariesCount: number; error?: string; type: 'RSS' | 'WebPage' }

        // Step 2: Use appropriate processing strategy
        if (detection.isRSS) {
          console.log('📡 Detected RSS feed, using RSS processing strategy')
          result = await processAsRSS(supabaseClient, source.id, source.url, source.name, detection.content)
        } else {
          console.log('🌐 Detected regular webpage, using web scraping strategy')
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
          
          // Update source's last_scraped_at
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
          
          // Update error info
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
      await generateDigestFromSummaries(supabaseClient, user.id)
    }

    const result: ProcessResult = {
      success: true,
      data: {
        processedSources,
        skippedSources,
        totalSummaries
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('❌ Process all sources failed:', error)
    
    const errorResult: ProcessResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }

    return new Response(
      JSON.stringify(errorResult),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

// Smart content type detection
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
      })

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status} with ${userAgent}`)
        continue
      }

      const contentType = response.headers.get('content-type') || ''
      const content = await response.text()
      
      console.log('📄 Content-Type:', contentType)
      console.log('📝 Content length:', content.length)
      console.log('📝 First 300 chars:', content.substring(0, 300))

      // Determine if it's RSS/Atom feed
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

// Check if content is RSS/Atom feed
function isRSSContent(contentType: string, content: string): boolean {
  // Check content type first
  if (contentType.includes('rss') || contentType.includes('atom') || contentType.includes('xml')) {
    console.log('✅ RSS detected by content-type')
    return true
  }

  // Check content for RSS/Atom markers
  const lowerContent = content.toLowerCase()
  
  // RSS 2.0 indicators
  if (lowerContent.includes('<rss') && lowerContent.includes('<channel')) {
    console.log('✅ RSS 2.0 detected by content analysis')
    return true
  }
  
  // Atom feed indicators
  if (lowerContent.includes('<feed') && lowerContent.includes('xmlns="http://www.w3.org/2005/atom"')) {
    console.log('✅ Atom feed detected by content analysis')
    return true
  }
  
  // Additional RSS patterns
  if (lowerContent.includes('<rss') || (lowerContent.includes('<channel') && lowerContent.includes('<item'))) {
    console.log('✅ RSS detected by pattern matching')
    return true
  }

  console.log('❌ Not detected as RSS/Atom feed')
  return false
}

// Process content as RSS feed
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

// Process content as regular webpage
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

// Parse RSS/Atom content
async function parseRSSContent(xmlContent: string, feedUrl: string): Promise<Article[]> {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'text/xml')

    // Check for parsing errors
    const parseErrors = doc.querySelectorAll('parsererror')
    if (parseErrors.length > 0) {
      throw new Error(`XML parsing error: ${parseErrors[0]?.textContent}`)
    }

    const articles: Article[] = []

    // Try RSS 2.0 format first
    const items = doc.querySelectorAll('item')
    console.log('🔍 Found', items.length, 'RSS items')
    
    if (items.length > 0) {
      items.forEach((item, index) => {
        if (index < 10) { // Limit to 10 most recent articles
          const title = item.querySelector('title')?.textContent?.trim()
          const link = item.querySelector('link')?.textContent?.trim()
          const pubDate = item.querySelector('pubDate')?.textContent?.trim()
          const description = item.querySelector('description')?.textContent?.trim()

          if (title && link) {
            articles.push({
              title,
              link,
              publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              description,
              content: description // For RSS, description is the initial content
            })
          }
        }
      })
    } else {
      // Try Atom format
      const entries = doc.querySelectorAll('entry')
      console.log('🔍 Found', entries.length, 'Atom entries')
      
      entries.forEach((entry, index) => {
        if (index < 10) { // Limit to 10 most recent articles
          const title = entry.querySelector('title')?.textContent?.trim()
          const linkElement = entry.querySelector('link')
          const link = linkElement?.getAttribute('href') || linkElement?.textContent?.trim()
          const published = entry.querySelector('published')?.textContent?.trim() || 
                           entry.querySelector('updated')?.textContent?.trim()
          const summary = entry.querySelector('summary')?.textContent?.trim() ||
                         entry.querySelector('content')?.textContent?.trim()

          if (title && link) {
            articles.push({
              title,
              link,
              publishedDate: published ? new Date(published).toISOString() : new Date().toISOString(),
              description: summary,
              content: summary
            })
          }
        }
      })
    }

    // Sort by published date (newest first)
    return articles.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())

  } catch (error) {
    console.error('❌ RSS parsing failed:', error)
    throw error
  }
}

// Extract articles from regular webpage
async function extractArticlesFromWebPage(htmlContent: string, pageUrl: string): Promise<Article[]> {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')

    // For now, treat the entire page as one article
    // In the future, this could be enhanced to detect multiple articles
    
    const titleElement = doc.querySelector('title, h1, .title, .headline')
    const title = titleElement?.textContent?.trim() || 'Untitled Article'
    
    // Extract main content using common selectors
    const contentSelectors = [
      'article',
      '.content',
      '.post-content', 
      '.entry-content',
      '.article-content',
      'main',
      '.main-content',
      'body'
    ]
    
    let content = ''
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector)
      if (element) {
        content = element.textContent?.trim() || ''
        if (content.length > 500) { // Use this content if it's substantial
          break
        }
      }
    }

    if (!content || content.length < 100) {
      throw new Error('Could not extract meaningful content from webpage')
    }

    // Limit content length
    if (content.length > 8000) {
      content = content.substring(0, 8000) + '...'
    }

    return [{
      title,
      link: pageUrl,
      publishedDate: new Date().toISOString(),
      description: content.substring(0, 200) + '...',
      content
    }]

  } catch (error) {
    console.error('❌ Web page extraction failed:', error)
    throw error
  }
}

// Common function to process articles (both RSS and web page)
async function processArticles(
  supabaseClient: any,
  sourceId: number,
  articles: Article[],
  sourceType: 'RSS' | 'WebPage'
): Promise<{ success: boolean; articlesCount: number; summariesCount: number; type: 'RSS' | 'WebPage' }> {
  let summariesCount = 0
  const maxArticles = sourceType === 'RSS' ? 5 : 1 // Limit articles to process

  for (let i = 0; i < Math.min(articles.length, maxArticles); i++) {
    const article = articles[i]
    
    try {
      // Check if we already have this article
      const { data: existingItem } = await supabaseClient
        .from('content_items')
        .select('id')
        .eq('source_id', sourceId)
        .eq('content_url', article.link)
        .maybeSingle()

      if (existingItem) {
        console.log('⏭️ Article already exists, skipping:', article.title)
        continue
      }

      // For RSS articles, try to get full content by scraping the article link
      let fullContent = article.content || ''
      
      if (sourceType === 'RSS' && article.link && (!fullContent || fullContent.length < 500)) {
        try {
          console.log('🔗 Fetching full content for RSS article:', article.link)
          fullContent = await fetchFullArticleContent(article.link)
        } catch (error) {
          console.log('⚠️ Could not fetch full content, using RSS description')
          fullContent = article.description || article.content || ''
        }
      }
      
      if (!fullContent || fullContent.length < 100) {
        console.log('⚠️ Article content too short, skipping:', article.title)
        continue
      }

      // Create content_item
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

      // Generate AI summary using DeepSeek
      const summaryResult = await generateAISummary(
        supabaseClient,
        contentItem.id,
        fullContent,
        article.link
      )

      if (summaryResult.success) {
        summariesCount++
        
        // Mark content as processed
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

// Fetch full article content from URL (improved version)
async function fetchFullArticleContent(articleUrl: string): Promise<string> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ]

  for (const userAgent of userAgents) {
    try {
      const response = await fetch(articleUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
        },
        redirect: 'follow',
      })

      if (!response.ok) {
        continue
      }

      const html = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      // Try multiple content selectors
      const contentSelectors = [
        'article',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.content',
        'main',
        '.main-content',
        '[data-testid="ArticleBody"]',
        '.story-body',
        '.article-body'
      ]

      for (const selector of contentSelectors) {
        const element = doc.querySelector(selector)
        if (element) {
          let content = element.textContent?.trim() || ''
          
          // Clean up content
          content = content.replace(/\s+/g, ' ').trim()
          
          if (content.length > 500) {
            // Limit content length for API processing
            return content.length > 8000 ? content.substring(0, 8000) + '...' : content
          }
        }
      }

      // Fallback: try to get any meaningful text
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

// Generate AI summary using DeepSeek
async function generateAISummary(
  supabaseClient: any,
  contentItemId: number,
  content: string,
  originalUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🤖 Generating AI summary for content item:', contentItemId)

    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set')
    }

    // Limit content length for API
    const truncatedContent = content.length > 6000 ? content.substring(0, 6000) + '...' : content

    const summary = await callDeepSeekAPI(truncatedContent, apiKey)

    if (!summary) {
      throw new Error('No summary generated from DeepSeek API')
    }

    // Store summary in database
    const { error: summaryError } = await supabaseClient
      .from('summaries')
      .insert({
        content_item_id: contentItemId,
        summary_text: summary,
        summary_type: 'ai_generated',
        model_used: 'deepseek',
        created_at: new Date().toISOString()
      })

    if (summaryError) {
      throw new Error(`Failed to store summary: ${summaryError.message}`)
    }

    console.log('✅ Successfully generated and stored AI summary')
    return { success: true }

  } catch (error) {
    console.error('❌ AI summary generation failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Call DeepSeek API for summarization
async function callDeepSeekAPI(content: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的内容摘要助手。请为给定的文章内容生成一个简洁、准确的中文摘要，突出关键信息和要点。摘要应该在200-300字之间。'
        },
        {
          role: 'user',
          content: `请为以下内容生成摘要：\n\n${content}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from DeepSeek API')
  }

  return data.choices[0].message.content.trim()
}

// Generate digest from summaries
async function generateDigestFromSummaries(supabaseClient: any, userId: string): Promise<void> {
  try {
    console.log('📝 Generating digest from summaries for user:', userId)

    // Get recent summaries (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: summaries, error: summariesError } = await supabaseClient
      .from('summaries')
      .select(`
        id,
        summary_text,
        content_items!inner (
          title,
          content_url,
          content_sources!inner (
            name,
            user_id
          )
        )
      `)
      .gte('created_at', twentyFourHoursAgo)
      .eq('content_items.content_sources.user_id', userId)

    if (summariesError || !summaries || summaries.length === 0) {
      console.log('No recent summaries found for digest generation')
      return
    }

    // Create digest entry
    const digestTitle = `Daily Digest - ${new Date().toLocaleDateString('zh-CN')}`
    const digestContent = summaries.map((summary: any) => 
      `## ${summary.content_items.title}\n\n${summary.summary_text}\n\n[阅读原文](${summary.content_items.content_url})\n\n---\n`
    ).join('\n')

    const { error: digestError } = await supabaseClient
      .from('digests')
      .insert({
        user_id: userId,
        title: digestTitle,
        content: digestContent,
        digest_type: 'daily',
        created_at: new Date().toISOString()
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