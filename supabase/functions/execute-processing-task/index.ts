import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts"

// Configuration for batch processing
const PROCESSING_CONFIG = {
  FETCH_TIMEOUT: 8 * 1000, // 8 seconds for individual fetch operations
  FUNCTION_TIMEOUT: 2.5 * 60 * 1000, // 2.5 minutes (留0.5分钟缓冲)
  SOURCES_PER_BATCH: 3, // 每批处理3个源（平衡性能与稳定性）
  ARTICLES_PER_SOURCE: 50, // 每个源最多50篇文章
  MAX_TOTAL_SOURCES: 10, // 最多处理10个源
}

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

  let task_id: number | null = null
  let supabaseClient: any = null

  try {
    const body = await req.json()
    task_id = body.task_id
    
    if (!task_id) {
      throw new Error('task_id is required')
    }

    // Use service role key for unrestricted access
    supabaseClient = createClient(
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

    // Get time range from task config
    const timeRange = task.config?.time_range || 'week'
    console.log('📅 Processing with time range:', timeRange)

    // Update task status to running
    await supabaseClient
      .from('processing_tasks')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', task_id)

    // Get user's sources with consistent ordering
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('content_sources')
      .select('*')
      .eq('user_id', task.user_id)
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    // Get batch info from task config  
    const currentBatch = task.config?.current_batch || 0
    const totalBatches = Math.ceil(Math.min(sources.length, PROCESSING_CONFIG.MAX_TOTAL_SOURCES) / PROCESSING_CONFIG.SOURCES_PER_BATCH)
    
    console.log(`🔄 Processing batch ${currentBatch + 1}/${totalBatches}`)
    console.log(`📊 Total sources: ${sources.length}, Processing ${PROCESSING_CONFIG.SOURCES_PER_BATCH} sources per batch`)
    
    // Calculate which sources to process in this batch
    const startIndex = currentBatch * PROCESSING_CONFIG.SOURCES_PER_BATCH
    const endIndex = Math.min(startIndex + PROCESSING_CONFIG.SOURCES_PER_BATCH, sources.length, PROCESSING_CONFIG.MAX_TOTAL_SOURCES)
    const batchSources = sources.slice(startIndex, endIndex)
    
    console.log(`🎯 Batch ${currentBatch + 1}: Processing sources ${startIndex + 1} to ${endIndex} (${batchSources.length} sources)`)
    console.log(`🔍 DEBUG: currentBatch=${currentBatch}, startIndex=${startIndex}, endIndex=${endIndex}`)
    console.log(`🔍 DEBUG: All sources:`, sources.map(s => s.name))
    console.log(`🔍 DEBUG: Batch sources:`, batchSources.map(s => s.name))
    
    const processedSources: any[] = []
    const skippedSources: any[] = []
    let totalSummaries = 0

    // Process each source in the current batch
    const startTime = Date.now()
    for (let i = 0; i < batchSources.length; i++) {
      const source = batchSources[i]
      
      // ⏰ 检查函数执行时间，如果超过2.5分钟就提前退出
      const elapsedTime = Date.now() - startTime
      if (elapsedTime > PROCESSING_CONFIG.FUNCTION_TIMEOUT) {
        console.log(`⏰ Function approaching timeout limit (${elapsedTime}ms), exiting gracefully...`)
        console.log(`✅ Successfully processed ${processedSources.length} sources before timeout`)
        break
      }
      
      try {
        console.log(`🔄 Processing source (${i + 1}/${batchSources.length}) in batch ${currentBatch + 1}:`, source.name)
        
        // Update progress with batch information
        await supabaseClient
          .from('processing_tasks')
          .update({
            progress: {
              current_batch: currentBatch + 1,
              total_batches: totalBatches,
              batch_current: i + 1,
              batch_total: batchSources.length,
              global_current: startIndex + i + 1,
              global_total: Math.min(sources.length, PROCESSING_CONFIG.MAX_TOTAL_SOURCES),
              processed_sources: processedSources,
              skipped_sources: skippedSources,
              current_source: source.name,
              elapsed_time: elapsedTime
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
          result = await processAsRSS(supabaseClient, source.id, source.url, source.name, detection.content, timeRange, task_id)
        } else {
          console.log('🌐 Processing as webpage')
          result = await processAsWebPage(supabaseClient, source.id, source.url, source.name, detection.content, timeRange, task_id)
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

        // 📊 记录处理结果，但不生成digest（为了减少执行时间）
        if (result.success && result.summariesCount > 0) {
          console.log(`\n📊 Source Processing Summary:`)
          console.log(`  - Source: ${source.name}`)
          console.log(`  - Articles Found: ${result.articlesCount}`)
          console.log(`  - Summaries Generated: ${result.summariesCount}`)
          console.log(`  - Type: ${result.type}`)
          console.log(`⚠️ Digest generation deferred to end of processing to prevent timeout`)
        }

      } catch (error) {
        console.error('❌ Failed to process source:', source.name, error)
        skippedSources.push({
          name: source.name,
          reason: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    // 📋 生成最终处理总结
    console.log(`\n🎯 ===== TASK EXECUTION SUMMARY =====`)
    console.log(`📋 Task ID: ${task_id}`)
    console.log(`👤 User ID: ${task.user_id}`)
    console.log(`📅 Time Range: ${timeRange}`)
    console.log(`📊 Total Sources: ${sources.length}`)
    console.log(`✅ Successfully Processed: ${processedSources.length}`)
    console.log(`⚠️ Skipped Sources: ${skippedSources.length}`)
    console.log(`📝 Total Summaries Generated: ${totalSummaries}`)
    
    if (processedSources.length > 0) {
      console.log(`\n📈 Processed Sources Details:`)
      processedSources.forEach((source, index) => {
        console.log(`  ${index + 1}. ${source.name} - ${source.summariesCount} summaries (${source.articlesCount} articles)`)
      })
    }
    
    if (skippedSources.length > 0) {
      console.log(`\n⚠️ Skipped Sources Details:`)
      skippedSources.forEach((source, index) => {
        console.log(`  ${index + 1}. ${source.name} - Reason: ${source.reason}`)
      })
    }

    // Check if there are more batches to process
    const hasMoreBatches = currentBatch + 1 < totalBatches
    
    if (hasMoreBatches) {
      console.log(`\n🔄 Batch ${currentBatch + 1} completed. Scheduling next batch...`)
      
      // Update task config for next batch
      await supabaseClient
        .from('processing_tasks')
        .update({
          config: {
            ...task.config,
            current_batch: currentBatch + 1
          },
          progress: {
            current_batch: currentBatch + 1,
            total_batches: totalBatches,
            batch_status: 'completed',
            message: `Batch ${currentBatch + 1} completed. Starting batch ${currentBatch + 2}...`
          }
        })
        .eq('id', task_id)
      
      // Trigger next batch by calling execute-processing-task again
      console.log(`🚀 Triggering next batch (${currentBatch + 2}/${totalBatches})...`)
      
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-processing-task`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ task_id })
        })
        
        if (!response.ok) {
          console.error('❌ Failed to trigger next batch:', await response.text())
        } else {
          console.log('✅ Next batch triggered successfully')
        }
      } catch (triggerError) {
        console.error('❌ Error triggering next batch:', triggerError)
      }
      
      // Return current batch results (don't mark as completed yet)
      return new Response(
        JSON.stringify({
          success: true,
          batch_completed: currentBatch + 1,
          total_batches: totalBatches,
          has_more_batches: true,
          processed_sources: processedSources.length,
          total_summaries: totalSummaries
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // All batches completed - generate the final digest
    console.log('\n🔄 All batches completed. Generating final digest...')
    
    // Get all summaries for final digest generation
    const { data: allSummaries } = await supabaseClient
      .from('summaries')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    
    const summaryCount = allSummaries?.length || 0
    console.log(`📊 Found ${summaryCount} total summaries for final digest`)
    
    if (summaryCount > 0) {
      console.log(`\n🔄 Generating final digest with ${summaryCount} summaries...`)
      try {
        await generateDigestFromSummaries(supabaseClient, task.user_id, timeRange)
        console.log(`✅ Final digest successfully generated`)
      } catch (digestError) {
        console.error('❌ Failed to generate final digest:', digestError)
        // 不影响任务完成状态
      }
    } else {
      console.log('⚠️ No summaries available, skipping digest generation')
    }

    // Mark task as completed
    const finalResult = {
      processedSources,
      skippedSources,
      totalSummaries
    }

    console.log(`\n🔄 Updating task status to 'completed'...`)
    const { error: updateError } = await supabaseClient
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

    if (updateError) {
      console.error('❌ Failed to update task status:', updateError)
    } else {
      console.log(`✅ Task status successfully updated to 'completed'`)
    }

    console.log(`\n🎉 ===== TASK EXECUTION COMPLETED SUCCESSFULLY =====`)
    console.log(`📋 Task ID: ${task_id} - Status: COMPLETED`)
    console.log(`⏰ Completed at: ${new Date().toISOString()}`)
    console.log(`📊 Final Result: ${totalSummaries} summaries from ${processedSources.length} sources`)
    console.log(`🎯 Digests have been generated and are ready for user viewing`)
    console.log(`===== END OF TASK EXECUTION =====\n`)

    return new Response(
      JSON.stringify({ success: true, result: finalResult }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('❌ Task execution failed:', error)
    
    // Try to update task status to failed using the task_id we already have
    if (task_id && supabaseClient) {
      try {
        await supabaseClient
          .from('processing_tasks')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', task_id)
        console.log('✅ Task status updated to failed')
      } catch (updateError) {
        console.error('❌ Failed to update task status:', updateError)
      }
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
      const timeoutId = setTimeout(() => controller.abort(), PROCESSING_CONFIG.FETCH_TIMEOUT)
      
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
  xmlContent: string,
  timeRange: string = 'week',
  taskId?: number
): Promise<{ success: boolean; articlesCount: number; summariesCount: number; error?: string; type: 'RSS' }> {
  try {
    console.log('📡 Processing as RSS feed:', sourceName)

    const articles = await parseRSSContent(xmlContent, feedUrl, timeRange)
    
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
    
    return await processArticles(supabaseClient, sourceId, articles, 'RSS', taskId)

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
  htmlContent: string,
  timeRange: string = 'week',
  taskId?: number
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
    
    return await processArticles(supabaseClient, sourceId, articles, 'WebPage', taskId)

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

async function parseRSSContent(xmlContent: string, feedUrl: string, timeRange: string = 'week'): Promise<Article[]> {
  console.log('🔍 Starting RSS content parsing for:', feedUrl, 'with time range:', timeRange)
  
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
    
    // Set cutoff date based on time range
    const cutoffDate = timeRange === 'today' 
      ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)  // 1 day ago
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // 7 days ago (week)
    
    console.log(`📅 Using cutoff date: ${cutoffDate.toISOString()} (${timeRange} range)`)
    
    if (items.length > 0) {
      // 使用传统for循环支持早退
      for (let index = 0; index < items.length; index++) {
        const item = items[index]
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
          
          if (articleDate >= cutoffDate) {
            articles.push({
              title,
              link,
              publishedDate: articleDate.toISOString(),
              description,
              content: description
            })
            console.log(`✅ Article ${index + 1} added to processing queue`)
          } else {
            console.log(`❌ Article ${index + 1} too old, skipping. Stopping processing as RSS is time-ordered.`)
            break // 正确的早退：跳出for循环
          }
        } else {
          console.log(`❌ Item ${index + 1} SKIPPED: Missing title (${!!title}) or link (${!!link})`)
        }
        
        // 限制处理数量，避免处理过多数据
        if (articles.length >= PROCESSING_CONFIG.ARTICLES_PER_SOURCE) {
          console.log(`📊 Reached maximum of ${PROCESSING_CONFIG.ARTICLES_PER_SOURCE} articles, stopping processing`)
          break
        }
      }
    } else {
      // Try Atom format
      const entries = doc!.querySelectorAll('entry')
      console.log('🔍 Found', entries.length, 'Atom entries via DOM')
      
      // 使用传统for循环支持早退
      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index]
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
          
          if (articleDate >= cutoffDate) {
            articles.push({
              title,
              link,
              publishedDate: articleDate.toISOString(),
              description: summary,
              content: summary
            })
            console.log(`✅ Atom Entry ${index + 1} added to processing queue`)
          } else {
            console.log(`❌ Atom Entry ${index + 1} too old, skipping. Stopping processing as feed is time-ordered.`)
            break // 正确的早退：跳出for循环
          }
        }
        
        // 限制处理数量，避免处理过多数据  
        if (articles.length >= PROCESSING_CONFIG.ARTICLES_PER_SOURCE) {
          console.log(`📊 Reached maximum of ${PROCESSING_CONFIG.ARTICLES_PER_SOURCE} articles, stopping processing`)
          break
        }
      }
    }

    console.log('✅ Successfully parsed', articles.length, 'articles from RSS/Atom feed')
    
    // 如果没有找到符合条件的文章，提前返回空数组
    if (articles.length === 0) {
      console.log('⚠️ No articles found within time range, returning empty array')
      return []
    }
    
    return articles.slice(0, 10)

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
    
    for (let i = 0; i < Math.min(items.length, 10); i++) {
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
          console.log(`❌ Regex Item ${i + 1} too old, skipping. Stopping regex parsing as RSS is time-ordered.`)
          break // Early exit from loop - no need to check older items
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

// Add queue integration at the top after imports
async function queueContentFetchJobs(
  supabaseClient: any,
  articles: Article[],
  sourceId: number,
  taskId: number
): Promise<{ success: boolean; queuedCount: number }> {
  try {
    console.log(`📥 Queueing ${articles.length} articles for content fetch`)

    // Prepare content fetch jobs for articles that need full content
    const fetchJobs = articles
      .filter(article => !article.description || article.description.length < 100)
      .slice(0, 5) // Intelligent limit for high-fetch sources
      .map(article => ({
        article_url: article.url,
        source_id: sourceId,
        article_title: article.title,
        article_description: article.description || '',
        published_date: article.published_date,
        task_id: taskId,
        fetch_status: 'pending'
      }))

    if (fetchJobs.length === 0) {
      console.log('✅ No articles need content fetching')
      return { success: true, queuedCount: 0 }
    }

    // Insert into content fetch queue
    const { error: queueError } = await supabaseClient
      .from('content_fetch_queue')
      .insert(fetchJobs)

    if (queueError) {
      throw new Error(`Failed to queue content fetch jobs: ${queueError.message}`)
    }

    console.log(`✅ Queued ${fetchJobs.length} content fetch jobs`)

    // Trigger content fetch queue processing
    setTimeout(async () => {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/queue-content-fetch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (error) {
        console.error('Failed to trigger content fetch queue:', error)
      }
    }, 1000) // Delay to allow current function to complete

    return { success: true, queuedCount: fetchJobs.length }

  } catch (error) {
    console.error('❌ Failed to queue content fetch jobs:', error)
    return { success: false, queuedCount: 0 }
  }
}

async function processArticles(
  supabaseClient: any,
  sourceId: number,
  articles: Article[],
  sourceType: 'RSS' | 'WebPage',
  taskId?: number
): Promise<{ success: boolean; articlesCount: number; summariesCount: number; error?: string; type: 'RSS' | 'WebPage' }> {
  let summariesCount = 0
  
  // 智能限制：根据是否需要全文抓取来调整数量
  let maxArticles = sourceType === 'RSS' ? PROCESSING_CONFIG.ARTICLES_PER_SOURCE : 1
  
  // 检测是否为高频源（需要大量全文抓取）
  const needsFullFetch = articles.some(article => 
    !article.description || article.description.length < 100
  )
  
  if (needsFullFetch && sourceType === 'RSS') {
    // 对于需要全文抓取的源（如TechCrunch），使用队列系统处理
    console.log(`🎯 High-fetch source detected, using queue system for content processing`)
    
    // Queue the content fetch jobs instead of processing immediately
    // Pass the current task_id from function context
    const currentTaskId = taskId || parseInt(Deno.env.get('CURRENT_TASK_ID') || '0')
    const queueResult = await queueContentFetchJobs(
      supabaseClient,
      articles.slice(0, maxArticles),
      sourceId,
      currentTaskId
    )

    if (queueResult.success) {
      console.log(`✅ Queued ${queueResult.queuedCount} articles for background processing`)
      return {
        success: true,
        articlesCount: queueResult.queuedCount,
        summariesCount: 0, // Will be processed asynchronously
        type: sourceType
      }
    } else {
      console.log('⚠️ Queue system failed, falling back to immediate processing')
      maxArticles = Math.min(3, maxArticles) // Further reduce for fallback
    }
  }

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

      let fullContent = article.content || article.description || ''
      
      // 如果RSS内容太短或为空，尝试全文抓取
      if (sourceType === 'RSS' && (!fullContent || fullContent.length < 100)) {
        console.log('📰 RSS content too short, attempting full article fetch for:', article.title)
        try {
          const fetchedContent = await fetchFullArticleContent(article.link)
          if (fetchedContent && fetchedContent.length > 100) {
            fullContent = fetchedContent
            console.log('✅ Successfully fetched full article content')
          } else {
            console.log('⚠️ Full fetch also returned short content, using title as fallback')
            fullContent = article.title + '. ' + (article.description || article.content || '')
          }
        } catch (fetchError) {
          console.log('⚠️ Full fetch failed, using title as fallback:', fetchError)
          fullContent = article.title + '. ' + (article.description || article.content || '')
        }
      }
      
      if (!fullContent || fullContent.length < 50) {
        console.log('⚠️ Article content still too short after all attempts, skipping:', article.title)
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

async function generateDigestFromSummaries(supabaseClient: any, userId: string, timeRange: string = 'week'): Promise<void> {
  try {
    console.log('📝 Generating digest from summaries for user:', userId, 'timeRange:', timeRange)

    // 根据时间范围设置查询条件
    const timeRangeMs = timeRange === 'today' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    const timeAgo = new Date(Date.now() - timeRangeMs).toISOString()
    
    // 1. 获取指定时间范围的摘要数据
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
      .gte('created_at', timeAgo)
      .eq('content_items.content_sources.user_id', userId)
      .order('created_at', { ascending: false })

    if (summariesError || !summaries || summaries.length === 0) {
      console.log('No recent summaries found for digest generation')
      return
    }

    console.log(`📊 Found ${summaries.length} summaries for digest generation`)

    // 2. 创建 digest 记录
    const digestTitle = timeRange === 'today' 
      ? `Daily Digest - ${new Date().toLocaleDateString('zh-CN')}`
      : `Weekly Digest - ${new Date().toLocaleDateString('zh-CN')}`
    const digestContent = `# ${digestTitle}\n\n` + 
      summaries.map((summary: any) => {
        const publishedDate = summary.content_items.published_date ? 
          new Date(summary.content_items.published_date).toLocaleDateString('zh-CN') : 
          '未知日期'
        const sourceName = summary.content_items.content_sources.name
        
        return `## ${summary.content_items.title}\n\n**来源**: ${sourceName} | **发布**: ${publishedDate}\n\n${summary.summary_text}\n\n[阅读原文](${summary.content_items.content_url})\n\n---\n`
      }).join('\n')

    const { data: digest, error: digestError } = await supabaseClient
      .from('digests')
      .insert({
        user_id: userId,
        title: digestTitle,
        content: digestContent,
        generation_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      })
      .select()
      .single()

    if (digestError || !digest) {
      console.error('❌ Failed to create digest:', digestError)
      return
    }

    console.log('✅ Successfully created digest with ID:', digest.id)
    console.log(`📋 Digest Details:`)
    console.log(`  - Title: ${digestTitle}`)
    console.log(`  - User ID: ${userId}`)
    console.log(`  - Time Range: ${timeRange}`)
    console.log(`  - Summaries Count: ${summaries.length}`)

    // 3. 创建 digest_items 关联记录
    const digestItems = summaries.map((summary: any, index: number) => ({
      digest_id: digest.id,
      summary_id: summary.id,
      order_position: index + 1
    }))

    const { error: digestItemsError } = await supabaseClient
      .from('digest_items')
      .insert(digestItems)

    if (digestItemsError) {
      console.error('❌ Failed to create digest items:', digestItemsError)
      // 删除刚创建的 digest，因为没有关联的 items
      await supabaseClient
        .from('digests')
        .delete()
        .eq('id', digest.id)
      return
    }

    console.log(`✅ Successfully created ${digestItems.length} digest items`)
    console.log(`🎉 Digest generation completed successfully!`)
    console.log(`📖 Digest ID ${digest.id} is now available for user viewing`)
    console.log(`🔗 User can access digest through the frontend digest page`)

  } catch (error) {
    console.error('❌ Digest generation failed:', error)
  }
} 