import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

// Queue processing configuration
const QUEUE_CONFIG = {
  BATCH_SIZE: 10,
  FETCH_TIMEOUT: 8000,
  MAX_CONTENT_LENGTH: 50000,
  MIN_CONTENT_LENGTH: 50
}

interface ContentFetchJob {
  id: number
  article_url: string
  source_id: number
  article_title: string
  article_description?: string
  published_date?: string
  task_id: number
  job_id: number
}

interface FetchResult {
  id: number
  success: boolean
  content?: string
  error?: string
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    console.log('🚀 Content Fetch Queue - Starting batch processing')

    // Get batch of pending content fetch jobs
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('content_fetch_queue')
      .select('*')
      .eq('fetch_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(QUEUE_CONFIG.BATCH_SIZE)

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`)
    }

    if (!jobs || jobs.length === 0) {
      console.log('✅ No pending content fetch jobs found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending jobs',
          processed: 0
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`📝 Found ${jobs.length} content fetch jobs to process`)

    // Mark jobs as processing
    const jobIds = jobs.map(job => job.id)
    await supabaseClient
      .from('content_fetch_queue')
      .update({ 
        fetch_status: 'fetching',
        fetched_at: new Date().toISOString()
      })
      .in('id', jobIds)

    // Process jobs in parallel with timeout
    const fetchPromises = jobs.map(job => fetchArticleContent(job))
    const results = await Promise.allSettled(fetchPromises)

    // Update results in database
    const updates = results.map((result, index) => {
      const job = jobs[index]
      
      if (result.status === 'fulfilled' && result.value.success) {
        return {
          id: job.id,
          fetch_status: 'completed',
          content_text: result.value.content,
          fetch_error: null
        }
      } else {
        const error = result.status === 'rejected' 
          ? result.reason?.message || 'Unknown error'
          : result.value.error || 'Fetch failed'
        
        return {
          id: job.id,
          fetch_status: 'failed',
          content_text: null,
          fetch_error: error
        }
      }
    })

    // Batch update all results
    for (const update of updates) {
      await supabaseClient
        .from('content_fetch_queue')
        .update({
          fetch_status: update.fetch_status,
          content_text: update.content_text,
          fetch_error: update.fetch_error
        })
        .eq('id', update.id)
    }

    const successCount = updates.filter(u => u.fetch_status === 'completed').length
    const failCount = updates.filter(u => u.fetch_status === 'failed').length

    console.log(`✅ Content fetch batch completed: ${successCount} success, ${failCount} failed`)

    // Trigger next queue processing if more jobs exist
    await checkAndTriggerNextQueues(supabaseClient, jobs[0].task_id)

    return new Response(
      JSON.stringify({
        success: true,
        processed: jobs.length,
        successful: successCount,
        failed: failCount
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Content fetch queue error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function fetchArticleContent(job: ContentFetchJob): Promise<FetchResult> {
  try {
    console.log(`🔍 Fetching content for: ${job.article_title}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), QUEUE_CONFIG.FETCH_TIMEOUT)

    const response = await fetch(job.article_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const content = extractMainContent(html)

    if (content.length < QUEUE_CONFIG.MIN_CONTENT_LENGTH) {
      throw new Error(`Content too short: ${content.length} characters`)
    }

    const trimmedContent = content.length > QUEUE_CONFIG.MAX_CONTENT_LENGTH
      ? content.substring(0, QUEUE_CONFIG.MAX_CONTENT_LENGTH) + '...'
      : content

    return {
      id: job.id,
      success: true,
      content: trimmedContent
    }

  } catch (error) {
    console.error(`❌ Failed to fetch ${job.article_url}:`, error.message)
    return {
      id: job.id,
      success: false,
      error: error.message
    }
  }
}

function extractMainContent(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    if (!doc) return ''

    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.advertisement', '.ads', '.sidebar', '.comments',
      '#comments', '.social-share', '.related-posts'
    ]
    
    unwantedSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector)
      elements.forEach(el => el.remove())
    })

    // Try to find main content areas
    const contentSelectors = [
      'article', '[role="main"]', 'main', '.content', 
      '.post-content', '.article-content', '.entry-content',
      '.story-body', '.article-body'
    ]

    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector)
      if (element) {
        const text = element.textContent?.trim() || ''
        if (text.length > 100) {
          return text
        }
      }
    }

    // Fallback to body content
    const bodyText = doc.body?.textContent?.trim() || ''
    return bodyText

  } catch (error) {
    console.error('Content extraction error:', error)
    return ''
  }
}

async function checkAndTriggerNextQueues(supabaseClient: any, taskId: number) {
  try {
    // Check if all content fetch jobs for this task are completed
    const { data: pendingJobs } = await supabaseClient
      .from('content_fetch_queue')
      .select('id')
      .eq('task_id', taskId)
      .eq('fetch_status', 'pending')

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log('🎯 All content fetch jobs completed, triggering AI summary queue')
      
      // Trigger AI summary queue
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/queue-ai-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: taskId })
      })
    }
  } catch (error) {
    console.error('Failed to trigger next queue:', error)
  }
} 