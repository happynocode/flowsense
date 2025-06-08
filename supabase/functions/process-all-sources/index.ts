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

console.log("Process All Sources Edge Function loaded!")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Initialize Supabase client
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

    console.log('🚀 Starting to process all sources for user:', user.id)

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

    // Process each source
    for (const source of sources) {
      try {
        console.log('🔄 Processing source:', source.name)
        
        // Check if it's an RSS feed
        const isRSSFeed = await checkIfRSSFeed(source.url)
        
        if (!isRSSFeed) {
          console.log('⚠️ Skipping non-RSS source:', source.name)
          skippedSources.push({
            name: source.name,
            reason: '仅支持RSS feed格式'
          })
          continue
        }

        // Process RSS source
        const result = await processRSSSource(
          supabaseClient,
          source.id,
          source.url,
          source.name
        )
        
        if (result.success) {
          processedSources.push({
            name: source.name,
            articlesCount: result.articlesCount,
            summariesCount: result.summariesCount
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

// Helper function to check if URL is RSS feed and fetch it
async function checkIfRSSFeed(url: string): Promise<boolean> {
  try {
    console.log('🔍 Checking if RSS feed:', url)
    
    // 尝试多种User-Agent
    const userAgents = [
      'Mozilla/5.0 (compatible; DigestBot/1.0)',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Feedly/1.0 (+http://www.feedly.com/fetcher.html; 1 subscribers)',
      'FeedParser/1.0'
    ]

    for (const userAgent of userAgents) {
      try {
        console.log(`🤖 Trying with User-Agent: ${userAgent}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Accept-Encoding': 'gzip, deflate',
          },
          redirect: 'follow', // 自动跟随重定向
        })

        if (!response.ok) {
          console.log(`❌ Failed to fetch URL with ${userAgent}: ${response.status} ${response.statusText}`)
          continue
        }

        const contentType = response.headers.get('content-type') || ''
        const text = await response.text()

        console.log('📄 Content-Type:', contentType)
        console.log('📝 Response length:', text.length)
        console.log('📝 First 200 chars:', text.substring(0, 200))

        // Check content type
        if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
          console.log('✅ Content-Type indicates RSS/XML')
          return true
        }

        // Check content for RSS/XML markers
        const lowerText = text.toLowerCase()
        if (lowerText.includes('<rss') || lowerText.includes('<feed') || lowerText.includes('<channel') || lowerText.includes('xmlns="http://www.w3.org/2005/atom"')) {
          console.log('✅ Content contains RSS/Atom XML markers')
          return true
        }

        console.log(`❌ URL does not appear to be an RSS feed with ${userAgent}`)
        
      } catch (error) {
        console.error(`❌ Error with ${userAgent}:`, error)
        continue
      }
    }

    console.log('❌ Failed to validate RSS feed with all user agents')
    return false

  } catch (error) {
    console.error('❌ Error checking RSS feed:', error)
    return false
  }
}

// Process a single RSS source
async function processRSSSource(
  supabaseClient: any,
  sourceId: number,
  feedUrl: string,
  sourceName: string
): Promise<{ success: boolean; articlesCount: number; summariesCount: number; error?: string }> {
  try {
    console.log('📡 Processing RSS source:', sourceName)

    // Fetch and parse RSS feed
    const articles = await fetchRSSArticles(feedUrl)
    
    if (!articles || articles.length === 0) {
      return {
        success: false,
        articlesCount: 0,
        summariesCount: 0,
        error: '未能从RSS feed中获取文章'
      }
    }

    console.log('📰 Found', articles.length, 'articles from RSS feed')
    
    let summariesCount = 0

    // Limit to most recent 5 articles to avoid overwhelming the system
    const recentArticles = articles.slice(0, 5)

    for (const article of recentArticles) {
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

        // Get full article content by scraping the webpage
        const fullContent = await fetchFullArticleContent(article.link)
        
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
        const summaryResult = await generateSimpleSummary(
          supabaseClient, 
          contentItem.id, 
          fullContent, 
          article.link
        )
        
        if (summaryResult) {
          summariesCount++
          console.log('✅ Successfully created summary for:', article.title)
        }

      } catch (error) {
        console.error('❌ Failed to process article:', article.title, error)
        continue
      }
    }

    return {
      success: true,
      articlesCount: recentArticles.length,
      summariesCount
    }

  } catch (error) {
    console.error('❌ Failed to process RSS source:', error)
    return {
      success: false,
      articlesCount: 0,
      summariesCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Fetch articles from RSS feed
async function fetchRSSArticles(feedUrl: string): Promise<Article[]> {
  const userAgents = [
    'Mozilla/5.0 (compatible; DigestBot/1.0)',
    'Feedly/1.0 (+http://www.feedly.com/fetcher.html; 1 subscribers)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'FeedParser/1.0'
  ]

  for (const userAgent of userAgents) {
    try {
      console.log(`📡 Fetching RSS feed with ${userAgent}:`, feedUrl)
      
      const response = await fetch(feedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Encoding': 'gzip, deflate',
        },
        redirect: 'follow',
      })

      if (!response.ok) {
        console.log(`❌ Failed to fetch RSS feed with ${userAgent}: ${response.status} ${response.statusText}`)
        continue
      }

      const xmlText = await response.text()
      console.log('📝 XML length:', xmlText.length)
      console.log('📝 First 500 chars:', xmlText.substring(0, 500))
      
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlText, 'text/xml')

      // 检查解析错误
      const parseErrors = doc.querySelectorAll('parsererror')
      if (parseErrors.length > 0) {
        console.error('❌ XML parsing errors:', parseErrors[0]?.textContent)
        continue
      }

      if (!doc) {
        console.error('❌ Failed to parse XML')
        continue
      }

      const articles: Article[] = []

      // Try RSS 2.0 format first
      const items = doc.querySelectorAll('item')
      console.log('🔍 Found', items.length, 'RSS items')
      
      if (items.length > 0) {
        items.forEach((item, index) => {
          if (index < 5) { // Log first 5 items for debugging
            console.log(`📄 Item ${index + 1}:`, {
              title: item.querySelector('title')?.textContent?.trim()?.substring(0, 50),
              link: item.querySelector('link')?.textContent?.trim()?.substring(0, 50),
              pubDate: item.querySelector('pubDate')?.textContent?.trim()
            })
          }
          
          const title = item.querySelector('title')?.textContent?.trim()
          const link = item.querySelector('link')?.textContent?.trim()
          const pubDate = item.querySelector('pubDate')?.textContent?.trim()
          const description = item.querySelector('description')?.textContent?.trim()

          if (title && link) {
            articles.push({
              title,
              link,
              publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              description
            })
          }
        })
      } else {
        // Try Atom format
        const entries = doc.querySelectorAll('entry')
        console.log('🔍 Found', entries.length, 'Atom entries')
        
        entries.forEach((entry, index) => {
          if (index < 5) { // Log first 5 entries for debugging
            const linkElement = entry.querySelector('link')
            console.log(`📄 Entry ${index + 1}:`, {
              title: entry.querySelector('title')?.textContent?.trim()?.substring(0, 50),
              link: (linkElement?.getAttribute('href') || linkElement?.textContent?.trim())?.substring(0, 50),
              published: entry.querySelector('published')?.textContent?.trim() || entry.querySelector('updated')?.textContent?.trim()
            })
          }
          
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
              description: summary
            })
          }
        })
      }

      console.log('✅ Successfully parsed', articles.length, 'articles from RSS feed')
      
      if (articles.length === 0) {
        console.log('⚠️ No articles found, but XML was valid. Continuing to try other user agents...')
        continue
      }
      
      // Sort by published date (newest first)
      return articles.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())

    } catch (error) {
      console.error(`❌ Failed to fetch RSS articles with ${userAgent}:`, error)
      continue
    }
  }

  throw new Error('未能从RSS feed中获取文章')
}

// Fetch full article content by scraping the webpage
async function fetchFullArticleContent(articleUrl: string): Promise<string> {
  try {
    console.log('🌐 Fetching full content from:', articleUrl)
    
    const response = await fetch(articleUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DigestBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status}`)
    }

    const html = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    if (!doc) {
      throw new Error('Failed to parse HTML')
    }

    // Try to extract main content using various selectors
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.content',
      '.post',
      '.article',
      '.main-content',
      '#content',
      '.story-body',
      '.article-body'
    ]

    let content = ''
    
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector)
      if (element) {
        content = element.textContent || ''
        if (content.length > 500) {
          break
        }
      }
    }

    // If no content found with selectors, try to get body content
    if (!content || content.length < 500) {
      const bodyElement = doc.querySelector('body')
      if (bodyElement) {
        content = bodyElement.textContent || ''
      }
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n')  // Remove empty lines
      .trim()

    if (content.length > 50000) {
      content = content.substring(0, 50000) + '...'
    }

    console.log('✅ Successfully extracted', content.length, 'characters of content')
    return content

  } catch (error) {
    console.error('❌ Failed to fetch article content:', error)
    return ''
  }
}

// Generate AI summary using DeepSeek API
async function generateSimpleSummary(
  supabaseClient: any,
  contentItemId: number,
  content: string,
  originalUrl: string
): Promise<any> {
  try {
    console.log('🤖 Generating AI summary...')
    
    // Get DeepSeek API key from environment
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    
    if (!deepseekApiKey) {
      console.error('❌ DEEPSEEK_API_KEY not found in environment variables')
      return null
    }

    // Use DeepSeek API for summarization
    const summaryText = await callDeepSeekAPI(content, deepseekApiKey)

    if (!summaryText) {
      console.error('❌ Failed to generate summary from DeepSeek API')
      return null
    }

    // Calculate reading time
    const wordCount = summaryText.split(/\s+/).length
    const readingTime = Math.max(1, Math.round(wordCount / 200))

    // Create summary record
    const { data: summary, error: summaryError } = await supabaseClient
      .from('summaries')
      .insert({
        content_item_id: contentItemId,
        summary_text: summaryText,
        reading_time: readingTime,
        model_used: 'deepseek-chat'
      })
      .select()
      .single()

    if (summaryError) {
      console.error('❌ Failed to create summary:', summaryError)
      return null
    }

    // Mark content item as processed
    await supabaseClient
      .from('content_items')
      .update({ is_processed: true })
      .eq('id', contentItemId)

    console.log('✅ Successfully created summary:', summary.id)
    return summary

  } catch (error) {
    console.error('❌ Summary generation failed:', error)
    return null
  }
}

// Call DeepSeek API
async function callDeepSeekAPI(content: string, apiKey: string): Promise<string> {
  try {
    console.log('🤖 Calling DeepSeek API...')
    
    // Limit content length to avoid API limits
    const maxContentLength = 8000
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...'
      : content

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的内容摘要助手。请将文章内容总结为结构化的摘要，包含关键主题、要点和见解。使用中文回复，格式要清晰易读。'
          },
          {
            role: 'user',
            content: `请总结以下文章内容，提取3-5个关键主题，每个主题包含简洁的描述和要点：\n\n${truncatedContent}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ DeepSeek API error:', response.status, errorText)
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = await response.json()
    const summaryText = data.choices?.[0]?.message?.content

    if (!summaryText) {
      throw new Error('No summary text returned from DeepSeek API')
    }

    console.log('✅ Successfully generated summary from DeepSeek API')
    return summaryText

  } catch (error) {
    console.error('❌ DeepSeek API call failed:', error)
    throw error
  }
}

// Generate digest from summaries
async function generateDigestFromSummaries(supabaseClient: any, userId: string): Promise<void> {
  try {
    console.log('📰 Generating digest...')

    const today = new Date().toISOString().split('T')[0]
    
    // Check if digest already exists for today
    const { data: existingDigest } = await supabaseClient
      .from('digests')
      .select('id')
      .eq('user_id', userId)
      .eq('generation_date', today)
      .maybeSingle()

    if (existingDigest) {
      console.log('📰 Digest already exists for today, deleting old one')
      await supabaseClient
        .from('digests')
        .delete()
        .eq('id', existingDigest.id)
    }

    // Get recent summaries (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { data: recentSummaries, error: summariesError } = await supabaseClient
      .from('summaries')
      .select(`
        *,
        content_items!inner(
          title,
          content_url,
          published_date,
          content_sources!inner(
            name,
            user_id
          )
        )
      `)
      .gte('created_at', yesterday.toISOString())
      .eq('content_items.content_sources.user_id', userId)
      .order('created_at', { ascending: false })

    if (summariesError || !recentSummaries || recentSummaries.length === 0) {
      console.log('📰 No recent summaries found')
      return
    }

    console.log('📰 Found', recentSummaries.length, 'recent summaries')

    // Create digest
    const digestTitle = `Daily Digest - ${new Date().toLocaleDateString('zh-CN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`

    const { data: digest, error: digestError } = await supabaseClient
      .from('digests')
      .insert({
        user_id: userId,
        title: digestTitle,
        generation_date: today,
        is_read: false
      })
      .select()
      .single()

    if (digestError) {
      console.error('❌ Failed to create digest:', digestError)
      return
    }

    // Add digest items
    for (let i = 0; i < recentSummaries.length; i++) {
      const summary = recentSummaries[i]
      
      await supabaseClient
        .from('digest_items')
        .insert({
          digest_id: digest.id,
          summary_id: summary.id,
          order_position: i
        })
    }

    console.log('✅ Successfully generated digest:', digest.id)

  } catch (error) {
    console.error('❌ Failed to generate digest:', error)
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-all-sources' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
