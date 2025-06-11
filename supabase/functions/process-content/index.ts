import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

const PROCESSING_CONFIG = {
  TIMEOUT_MS: 300000, // 5 minutes for individual content processing
  MAX_CONTENT_LENGTH: 50000,
  MIN_CONTENT_LENGTH: 200,
}

function createTimeoutPromise<T>(ms: number, errorMessage: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms)
  })
}

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { contentItemId } = await req.json()

    if (!contentItemId) {
      return new Response('Missing contentItemId', { status: 400 })
    }

    console.log(`🚀 Starting content processing for item: ${contentItemId}`)

    // Wrap the main processing in a timeout
    const result = await Promise.race([
      processContentItem(supabaseClient, contentItemId),
      createTimeoutPromise(PROCESSING_CONFIG.TIMEOUT_MS, 'Content processing timeout')
    ])

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Content processing error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function processContentItem(
  supabaseClient: any,
  contentItemId: number
): Promise<{ success: boolean; message: string; hasSummary: boolean }> {
  
  try {
    console.log(`🔍 Fetching content item: ${contentItemId}`)
    
    // Get content item details
    const { data: contentItem, error: fetchError } = await supabaseClient
      .from('content_items')
      .select('*')
      .eq('id', contentItemId)
      .single()

    if (fetchError || !contentItem) {
      console.error('❌ Failed to fetch content item:', fetchError)
      return { success: false, message: 'Content item not found', hasSummary: false }
    }

    console.log(`📄 Processing: "${contentItem.title}"`)

    // Check if summary already exists
    const { data: existingSummary } = await supabaseClient
      .from('summaries')
      .select('id')
      .eq('content_item_id', contentItemId)
      .single()

    if (existingSummary) {
      console.log('⏭️ Summary already exists for this content item, skipping duplicate processing')
      await checkAndTriggerDigestGeneration(supabaseClient, contentItem.source_id)
      
      return { success: true, message: 'Content already processed (duplicate skip)', hasSummary: true }
    }

    // Item is now considered processing. The lock in get_and_lock_pending_items prevents others from picking it.

    // Check if we need to fetch full content
    let fullContent = contentItem.content_text || ''
    
    if (!fullContent || fullContent.length < PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
      console.log(`🔍 Fetching full content from: ${contentItem.content_url}`)
      try {
        fullContent = await fetchFullArticleContent(contentItem.content_url)
      } catch (error) {
        console.log(`⚠️ Failed to fetch full content, using existing content: ${error.message}`)
        fullContent = contentItem.content_text || ''
      }
    }

    if (!fullContent || fullContent.trim().length < PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
      console.log('❌ Insufficient content for processing')
      await supabaseClient
        .from('content_items')
        .update({ 
          is_processed: true, // It's "processed" but with a failure state
          processing_error: 'Insufficient content' 
        })
        .eq('id', contentItemId)
      
      return { success: false, message: 'Insufficient content', hasSummary: false }
    }

    // Update content item with full content
    await supabaseClient
      .from('content_items')
      .update({ 
        content_text: fullContent.substring(0, PROCESSING_CONFIG.MAX_CONTENT_LENGTH)
      })
      .eq('id', contentItemId)

    // Generate AI summary
    console.log(`🤖 Generating AI summary for content item: ${contentItemId}`)
    const summaryResult = await generateAISummary(supabaseClient, contentItemId, fullContent, contentItem.content_url)

    if (summaryResult.success) {
      await supabaseClient
        .from('content_items')
        .update({ 
          is_processed: true,
          processing_error: null 
        })
        .eq('id', contentItemId)
      
      console.log(`✅ Successfully processed content item: ${contentItemId}`)
      
      await checkAndTriggerDigestGeneration(supabaseClient, contentItem.source_id)
      
      return { success: true, message: 'Content processed and summarized', hasSummary: true }
    } else {
      await supabaseClient
        .from('content_items')
        .update({ 
          is_processed: true, // Mark as processed even on failure
          processing_error: summaryResult.error || 'Summary generation failed' 
        })
        .eq('id', contentItemId)
      
      return { success: false, message: summaryResult.error || 'Summary generation failed', hasSummary: false }
    }

  } catch (error) {
    console.error('❌ Content processing error:', error)
    
    // Update status to failed
    try {
      await supabaseClient
        .from('content_items')
        .update({ 
          is_processed: true, // Mark as processed even on failure
          processing_error: error.message 
        })
        .eq('id', contentItemId)
    } catch (updateError) {
      console.error('❌ Failed to update error status:', updateError)
    }
    
    return { success: false, message: error.message, hasSummary: false }
  }
}

async function fetchFullArticleContent(articleUrl: string): Promise<string> {
  console.log(`🔍 Fetching full content from: ${articleUrl}`)
  
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ]

  for (let attempt = 0; attempt < userAgents.length; attempt++) {
    try {
      const response = await fetch(articleUrl, {
        headers: {
          'User-Agent': userAgents[attempt],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        redirect: 'follow'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      console.log(`📝 Fetched HTML content: ${html.length} characters`)

      const content = extractTextContent(html)
      console.log(`📄 Extracted text content: ${content.length} characters`)

      if (content.length < PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
        throw new Error(`Content too short: ${content.length} characters`)
      }

      return content

    } catch (error) {
      console.log(`❌ Attempt ${attempt + 1} failed:`, error.message)
      if (attempt === userAgents.length - 1) {
        throw error
      }
    }
  }

  throw new Error('All attempts to fetch content failed')
}

function extractTextContent(html: string): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Remove script and style elements
    const scriptsAndStyles = doc.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation')
    scriptsAndStyles.forEach(el => el.remove())

    // Try to find main content area
    const contentSelectors = [
      'article',
      '.post-content',
      '.entry-content', 
      '.article-content',
      '.content',
      'main',
      '.main-content',
      '.post',
      '.entry',
      '[role="main"]'
    ]

    let content = ''
    
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector)
      if (element) {
        content = element.textContent || element.innerText || ''
        if (content.length > PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
          console.log(`✅ Found content using selector: ${selector}`)
          break
        }
      }
    }

    // Fallback to body if no good content found
    if (content.length < PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
      const body = doc.querySelector('body')
      content = body?.textContent || body?.innerText || ''
      console.log('📄 Using body content as fallback')
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n')  // Remove extra blank lines
      .trim()

    return content

  } catch (error) {
    console.error('❌ Failed to extract text content:', error)
    return ''
  }
}

async function generateAISummary(
  supabaseClient: any,
  contentItemId: number,
  content: string,
  originalUrl: string
): Promise<{ success: boolean; error?: string }> {
  
  try {
    console.log(`🤖 Checking for existing summary for content item: ${contentItemId}`)
    
    // Double-check for existing summary to prevent duplicates
    const { data: existingSummary } = await supabaseClient
      .from('summaries')
      .select('id')
      .eq('content_item_id', contentItemId)
      .single()

    if (existingSummary) {
      console.log('⏭️ Summary already exists, skipping duplicate AI generation')
      return { success: true }
    }

    console.log('🤖 No existing summary found, generating new one with DeepSeek API')
    
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepSeekApiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured')
    }

    // Truncate content if too long
    const truncatedContent = content.length > PROCESSING_CONFIG.MAX_CONTENT_LENGTH 
      ? content.substring(0, PROCESSING_CONFIG.MAX_CONTENT_LENGTH) + '...'
      : content

    const summary = await callDeepSeekAPI(truncatedContent, deepSeekApiKey)

    // Store the summary
    const { error: insertError } = await supabaseClient
      .from('summaries')
      .insert({
        content_item_id: contentItemId,
        summary_text: summary,
        model_used: 'deepseek'
      })

    if (insertError) {
      console.error('❌ Failed to store summary:', insertError)
      return { success: false, error: 'Failed to store summary' }
    }

    console.log('✅ Successfully generated and stored new AI summary')
    return { success: true }

  } catch (error) {
    console.error('❌ AI summary generation failed:', error)
    return { success: false, error: error.message }
  }
}

async function callDeepSeekAPI(content: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
          content: 'You are a helpful assistant that summarizes articles into 1-3 main themes. For each theme, provide a relevant quote from the original article to support it.'
        },
        {
          role: 'user',
          content: `Please summarize this article into 1-3 main themes. For each theme, include a direct quote from the original article:\n\n${content}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    })
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

async function checkAndTriggerDigestGeneration(
  supabaseClient: any,
  sourceId: number
): Promise<void> {
  try {
    console.log(`🔍 Checking if ALL user's content items are processed (triggered by source: ${sourceId})`)
    
    // Get the source to find the user_id
    const { data: source } = await supabaseClient
      .from('content_sources')
      .select('user_id')
      .eq('id', sourceId)
      .single()
    
    if (!source) {
      console.log('❌ Source not found, cannot trigger digest generation')
      return
    }
    
    // Check if there are any unprocessed content items for ALL user's sources from today
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    // Get all user's active sources
    const { data: userSources } = await supabaseClient
      .from('content_sources')
      .select('id')
      .eq('user_id', source.user_id)
      .eq('is_active', true)
    
    if (!userSources || userSources.length === 0) {
      console.log('❌ No active sources found for user')
      return
    }
    
    const sourceIds = userSources.map(s => s.id)
    
    // Check for unprocessed items across ALL user's sources
    const { data: unprocessedItems, count } = await supabaseClient
      .from('content_items')
      .select('id', { count: 'exact' })
      .gte('created_at', startOfDay.toISOString())
      .eq('is_processed', false)
      .in('source_id', sourceIds)
    
    console.log(`📊 Found ${count || 0} unprocessed items across ALL user sources`)
    
    if (count === 0) {
      // All items for ALL user sources are processed, trigger digest generation
      console.log(`🎯 ALL sources processing complete! Triggering digest generation for user: ${source.user_id}`)
      
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-digest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            userId: source.user_id,
            timeRange: 'week'
          })
        })
        
        if (response.ok) {
          console.log(`✅ Successfully triggered digest generation for user: ${source.user_id}`)
        } else {
          console.error(`❌ Failed to trigger digest generation: ${response.status}`)
        }
      } catch (error) {
        console.error(`❌ Error triggering digest generation:`, error)
      }
    } else {
      console.log(`⏳ Still waiting for ${count} items across all user sources to be processed`)
    }
    
  } catch (error) {
    console.error('❌ Error checking digest generation trigger:', error)
  }
}