import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

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

const PROCESSING_CONFIG = {
  ARTICLES_PER_SOURCE: 50,
  TIMEOUT_MS: 300000, // 5 minutes, increased for safety
}

function createTimeoutPromise<T>(ms: number, errorMessage: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms)
  })
}

// 更新任务进度的辅助函数
async function updateTaskProgress(
  supabaseClient: any,
  taskId: number,
  currentSource: string,
  status: 'processing' | 'completed' | 'skipped',
  sourceResult?: any
): Promise<void> {
  try {
    // 获取当前任务
    const { data: task, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .select('progress')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      console.log(`⚠️ Could not find task ${taskId} for progress update`)
      return
    }

    const progress = task.progress || { current: 0, total: 0, processed_sources: [], skipped_sources: [] }

    // 更新当前处理的source
    if (status === 'processing') {
      progress.current_source = currentSource
      console.log(`📊 Task ${taskId}: Now processing ${currentSource}`)
    } else if (status === 'completed') {
      // 添加到已完成列表
      if (!progress.processed_sources.some((s: any) => s.name === currentSource)) {
        progress.processed_sources.push({
          name: currentSource,
          articles_count: sourceResult?.articlesCount || 0,
          completed_at: new Date().toISOString()
        })
        progress.current += 1
      }
      delete progress.current_source
      console.log(`✅ Task ${taskId}: Completed ${currentSource} (${progress.current}/${progress.total})`)
    } else if (status === 'skipped') {
      // 添加到跳过列表
      if (!progress.skipped_sources.some((s: any) => s.name === currentSource)) {
        progress.skipped_sources.push({
          name: currentSource,
          reason: sourceResult?.error || 'Unknown error',
          skipped_at: new Date().toISOString()
        })
        progress.current += 1
      }
      delete progress.current_source
      console.log(`⏭️ Task ${taskId}: Skipped ${currentSource} (${progress.current}/${progress.total})`)
    }

    // 更新数据库
    const { error: updateError } = await supabaseClient
      .from('processing_tasks')
      .update({ progress })
      .eq('id', taskId)

    if (updateError) {
      console.error(`❌ Failed to update task progress:`, updateError)
    }

  } catch (error) {
    console.error(`❌ Error updating task progress:`, error)
  }
}

// 检查并完成任务的辅助函数
async function checkAndCompleteTask(supabaseClient: any, taskId: number): Promise<void> {
  try {
    // 获取当前任务状态
    const { data: task, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .select('progress, user_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      console.log(`⚠️ Could not find task ${taskId} for completion check`)
      return
    }

    const progress = task.progress || { current: 0, total: 0, processed_sources: [], skipped_sources: [] }
    const completedCount = (progress.processed_sources?.length || 0) + (progress.skipped_sources?.length || 0)

    console.log(`📊 Task ${taskId} completion check: ${completedCount}/${progress.total}`)

    // 如果所有源都已处理完成
    if (completedCount >= progress.total && progress.total > 0) {
      console.log(`🎉 Task ${taskId} is complete! Triggering digest generation...`)

      // 更新任务状态为已完成
      const { error: updateError } = await supabaseClient
        .from('processing_tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: {
            processedSources: progress.processed_sources || [],
            skippedSources: progress.skipped_sources || [],
            totalSummaries: progress.processed_sources?.reduce((total: number, source: any) => total + (source.articles_count || 0), 0) || 0
          }
        })
        .eq('id', taskId)

      if (updateError) {
        console.error(`❌ Failed to complete task:`, updateError)
        return
      }

      // 触发生成digest
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-digest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            userId: task.user_id,
            timeRange: 'week'
          })
        })
        
        if (response.ok) {
          console.log(`✅ Successfully triggered digest generation for task ${taskId}`)
        } else {
          console.error(`❌ Failed to trigger digest generation: ${response.status}`)
        }
      } catch (error) {
        console.error(`❌ Error triggering digest generation:`, error)
      }
    }

  } catch (error) {
    console.error(`❌ Error checking task completion:`, error)
  }
}

async function updateFetchJobStatus(
  supabaseClient: any,
  jobId: number,
  status: 'completed' | 'failed',
  errorMessage?: string
) {
  const { error } = await supabaseClient
    .from('source_fetch_jobs')
    .update({ 
      status, 
      error_message: errorMessage,
      updated_at: new Date().toISOString() 
    })
    .eq('id', jobId);

  if (error) {
    console.error(`❌ Failed to update fetch job ${jobId} status to ${status}:`, error);
  } else {
    console.log(`✅ Fetch job ${jobId} status updated to ${status}.`);
  }
}

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { 
    sourceId, 
    sourceUrl, 
    sourceName, 
    timeRange = 'week', 
    taskId,
    fetchJobId // <-- New parameter from our queue processor
  } = await req.json()

  if (!fetchJobId || !sourceId || !sourceUrl) {
    return new Response('Missing fetchJobId, sourceId, or sourceUrl', { status: 400 })
  }

  console.log(`🚀 Starting content fetch for source: ${sourceName} (${sourceUrl}) [Task: ${taskId}, Job: ${fetchJobId}]`)
  
  try {
    // Update task progress - mark as current source
    if (taskId) {
      await updateTaskProgress(supabaseClient, taskId, sourceName, 'processing')
    }

    // Wrap the main processing in a timeout
    const result = await Promise.race([
      processSource(supabaseClient, sourceId, sourceUrl, sourceName, timeRange, taskId),
      createTimeoutPromise(PROCESSING_CONFIG.TIMEOUT_MS, 'Content fetch timeout')
    ])
    
    // On success, update the fetch job status
    await updateFetchJobStatus(supabaseClient, fetchJobId, 'completed');

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`❌ Content fetch error for job ${fetchJobId}:`, error.message)
    
    // On failure, update the fetch job status with the error
    await updateFetchJobStatus(supabaseClient, fetchJobId, 'failed', error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function processSource(
  supabaseClient: any,
  sourceId: number,
  sourceUrl: string,
  sourceName: string,
  timeRange: string,
  taskId?: number
): Promise<{ success: boolean; articlesCount: number; message: string }> {
  
  let articlesCount = 0;
  try {
    console.log(`🔍 Detecting content type for: ${sourceUrl}`);
    const detection = await detectContentType(sourceUrl);
    if (!detection) {
      throw new Error('Content detection failed');
    }

    let articles: Article[] = [];
    if (detection.isRSS) {
      console.log(`📡 Processing RSS feed: ${sourceUrl}`);
      articles = await parseRSSContent(detection.content, sourceUrl, timeRange);
    } else {
      // Future logic for non-RSS content can go here
      console.log(`🤷‍♀️ Non-RSS content type (${detection.contentType}) not yet supported. Skipping.`);
    }

    const { success, queuedCount } = await queueContentProcessingJobs(supabaseClient, articles, sourceId);
    articlesCount = queuedCount;

    if (!success) {
      // Log the error but don't throw, as the job should be considered "completed" from a fetch perspective
      console.error(`⚠️ Failed to queue articles for source ${sourceName}, but marking fetch as complete.`);
    }

    const result = { success: true, articlesCount, message: `Found and queued ${articlesCount} new articles.` };
    
    if (taskId) {
      await updateTaskProgress(supabaseClient, taskId, sourceName, 'completed', result);
      await checkAndCompleteTask(supabaseClient, taskId);
    }
    
    return result;

  } catch (error) {
    console.error(`❌ Processing source ${sourceName} failed:`, error.message);
    const result = { success: false, articlesCount: 0, message: error.message };
    
    if (taskId) {
      await updateTaskProgress(supabaseClient, taskId, sourceName, 'skipped', { error: error.message });
      await checkAndCompleteTask(supabaseClient, taskId);
    }
    
    // We re-throw the error so the main Deno.serve handler catches it
    // and correctly updates the fetch job status to 'failed'.
    throw error;
  }
}

async function detectContentType(url: string): Promise<ContentDetectionResult | null> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  ]

  for (let attempt = 0; attempt < userAgents.length; attempt++) {
    try {
      console.log(`🤖 Trying content detection with: ${userAgents[attempt]}`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgents[attempt],
          'Accept': 'application/rss+xml, application/atom+xml, text/xml, application/xml, text/html, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        redirect: 'follow'
      })

      if (!response.ok) {
        console.log(`❌ Response ${response.status} for ${url} with user-agent ${attempt + 1}`)
        continue
      }

      const contentType = response.headers.get('content-type') || ''
      console.log(`📄 Content-Type: ${contentType}`)
      
      const content = await response.text()
      console.log(`📝 Content length: ${content.length}`)

      const isRSS = isRSSContent(contentType, content)

      return {
        isRSS,
        contentType,
        content,
        responseStatus: response.status
      }

    } catch (error) {
      console.log(`❌ Attempt ${attempt + 1} failed:`, error.message)
      if (attempt === userAgents.length - 1) {
        throw error
      }
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

async function parseRSSContent(xmlContent: string, feedUrl: string, timeRange: string = 'week'): Promise<Article[]> {
  const articles: Article[] = []
  
  // Calculate cutoff date based on time range
  const now = new Date()
  let cutoffDate: Date
  
  switch (timeRange) {
    case 'day':
      cutoffDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days
      break
    case 'week':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days  
      break
    default:
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // default to 7 days
  }
  
  console.log(`📅 Using cutoff date: ${cutoffDate.toISOString()} (${timeRange} range)`)

  try {
    console.log(`🔍 Starting RSS content parsing for: ${feedUrl} with time range: ${timeRange}`)
    
    // Skip DOMParser for now due to Deno compatibility issues, use regex directly
    console.log('🔄 Using regex-based RSS parsing due to DOMParser limitations in Deno')
    return await parseRSSWithRegex(xmlContent, cutoffDate)

  } catch (error) {
    console.error('❌ RSS parsing failed:', error)
    return await parseRSSWithRegex(xmlContent, cutoffDate)
  }
}

async function parseRSSWithRegex(xmlContent: string, cutoffDate: Date): Promise<Article[]> {
  console.log('🔄 Starting regex-based RSS parsing')
  
  const articles: Article[] = []
  
  try {
    // First try RSS format
    const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
    const items = Array.from(xmlContent.matchAll(itemRegex))
    
    if (items.length > 0) {
      console.log('🔍 Found', items.length, 'RSS items via regex')
      
      for (let i = 0; i < Math.min(items.length, PROCESSING_CONFIG.ARTICLES_PER_SOURCE); i++) {
        const item = items[i]
        const itemContent = item[1]
        
        const titleMatch = itemContent.match(/<title(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)
        const title = titleMatch?.[1]?.trim()
        
        const linkMatch = itemContent.match(/<link(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i)
        let link = linkMatch?.[1]?.trim()
        
        if (!link) {
          const hrefMatch = itemContent.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
          link = hrefMatch?.[1]?.trim()
        }
        
        const pubDateMatch = itemContent.match(/<pubDate(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/i)
        const pubDateStr = pubDateMatch?.[1]?.trim()
        
        const descMatch = itemContent.match(/<description(?:\s[^>]*)?>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)
        const description = descMatch?.[1]?.trim()
        
        if (title && link) {
          const articleDate = pubDateStr ? new Date(pubDateStr) : new Date()
          
          if (articleDate >= cutoffDate) {
            articles.push({
              title: title.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
              link: link.replace(/&amp;/g, '&'),
              publishedDate: articleDate.toISOString(),
              description: description?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
              content: description?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
            })
            console.log(`✅ RSS article added: "${title}"`)
          } else {
            console.log(`❌ RSS article too old, stopping: "${title}"`)
            break
          }
        }
      }
    } else {
      // Try Atom format
      const entryRegex = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
      const entries = Array.from(xmlContent.matchAll(entryRegex))
      
      console.log('🔍 Found', entries.length, 'Atom entries via regex')
      
      for (let i = 0; i < Math.min(entries.length, PROCESSING_CONFIG.ARTICLES_PER_SOURCE); i++) {
        const entry = entries[i]
        const entryContent = entry[1]
        
        const titleMatch = entryContent.match(/<title(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)
        const title = titleMatch?.[1]?.trim()
        
        const linkMatch = entryContent.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
        const link = linkMatch?.[1]?.trim()
        
        const publishedMatch = entryContent.match(/<published(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/published>/i) ||
                              entryContent.match(/<updated(?:\s[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/updated>/i)
        const publishedStr = publishedMatch?.[1]?.trim()
        
        const summaryMatch = entryContent.match(/<summary(?:\s[^>]*)?>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i) ||
                            entryContent.match(/<content(?:\s[^>]*)?>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)
        const summary = summaryMatch?.[1]?.trim()
        
        if (title && link) {
          const articleDate = publishedStr ? new Date(publishedStr) : new Date()
          
          if (articleDate >= cutoffDate) {
            articles.push({
              title: title.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
              link: link.replace(/&amp;/g, '&'),
              publishedDate: articleDate.toISOString(),
              description: summary?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
              content: summary?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
            })
            console.log(`✅ Atom entry added: "${title}"`)
          } else {
            console.log(`❌ Atom entry too old, stopping: "${title}"`)
            break
          }
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

async function queueContentProcessingJobs(
  supabaseClient: any,
  articles: Article[],
  sourceId: number
): Promise<{ success: boolean; queuedCount: number }> {
  if (articles.length === 0) {
    return { success: true, queuedCount: 0 };
  }

  console.log(`📋 Adding ${articles.length} articles to the processing queue for source ${sourceId}`);

  const itemsToInsert = articles.map(article => ({
    source_id: sourceId,
    title: article.title,
    content_url: article.link,
    content_text: article.content,
    published_date: article.publishedDate,
    is_processed: false, // Use the correct boolean field
    processing_error: null,
  }));

  // Insert items and ignore conflicts on the unique 'content_url'
  const { error, count } = await supabaseClient
    .from('content_items')
    .insert(itemsToInsert, { onConflict: 'content_url', ignoreDuplicates: true });

  if (error) {
    console.error(`❌ Failed to insert content items for source ${sourceId}:`, error);
    return { success: false, queuedCount: 0 };
  }

  console.log(`✅ Saved ${count || 0} new articles for source: ${sourceId}`);
  return { success: true, queuedCount: count || 0 };
} 