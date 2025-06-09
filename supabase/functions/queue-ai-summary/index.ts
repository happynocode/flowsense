import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Queue processing configuration
const QUEUE_CONFIG = {
  BATCH_SIZE: 5,
  AI_TIMEOUT: 15000,
  MAX_RETRIES: 3
}

const DEEPSEEK_CONFIG = {
  API_URL: 'https://api.deepseek.com/v1/chat/completions',
  MODEL: 'deepseek-chat',
  MAX_TOKENS: 500,
  TEMPERATURE: 0.3
}

interface SummaryJob {
  id: number
  article_url: string
  article_title: string
  content_text: string
  source_id: number
  task_id: number
  published_date?: string
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
    console.log('🤖 AI Summary Queue - Starting batch processing')

    // Get articles that need AI summaries
    const { data: articles, error: articlesError } = await supabaseClient
      .from('content_fetch_queue')
      .select(`
        id,
        article_url,
        article_title,
        content_text,
        source_id,
        task_id,
        published_date
      `)
      .eq('fetch_status', 'completed')
      .not('content_text', 'is', null)
      .limit(QUEUE_CONFIG.BATCH_SIZE)

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`)
    }

    if (!articles || articles.length === 0) {
      console.log('✅ No articles ready for AI summary')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No articles ready for summary',
          processed: 0
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`🧠 Generating AI summaries for ${articles.length} articles`)

    // Process summaries in batches to avoid overwhelming DeepSeek API
    const summaryPromises = articles.map(article => generateAiSummary(article))
    const results = await Promise.allSettled(summaryPromises)

    let successCount = 0
    let failCount = 0

    // Save successful summaries to database
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const article = articles[i]

      if (result.status === 'fulfilled' && result.value.success) {
        // Insert into content_items table
        const { error: insertError } = await supabaseClient
          .from('content_items')
          .insert({
            url: article.article_url,
            title: article.article_title,
            description: result.value.summary,
            content: article.content_text,
            published_date: article.published_date,
            source_id: article.source_id,
            task_id: article.task_id,
            processing_status: 'completed'
          })

        if (insertError) {
          console.error(`Failed to insert content item for ${article.article_title}:`, insertError)
          failCount++
        } else {
          successCount++
          console.log(`✅ Saved summary for: ${article.article_title}`)
        }
      } else {
        const error = result.status === 'rejected' 
          ? result.reason?.message || 'Unknown error'
          : result.value.error || 'Summary generation failed'
        
        console.error(`❌ Failed to generate summary for ${article.article_title}:`, error)
        failCount++
      }
    }

    console.log(`✅ AI Summary batch completed: ${successCount} success, ${failCount} failed`)

    // Check if we should trigger digest building
    await checkAndTriggerDigestBuild(supabaseClient, articles[0].task_id)

    return new Response(
      JSON.stringify({
        success: true,
        processed: articles.length,
        successful: successCount,
        failed: failCount
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ AI Summary queue error:', error)
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

async function generateAiSummary(article: SummaryJob): Promise<{ success: boolean; summary?: string; error?: string }> {
  try {
    console.log(`🧠 Generating summary for: ${article.article_title}`)

    const prompt = `请为以下文章生成一个简洁的中文摘要（100-200字）：

标题：${article.article_title}
内容：${article.content_text.substring(0, 3000)}...

要求：
1. 用中文总结
2. 突出重点信息  
3. 保持客观中立
4. 100-200字左右`

    const response = await fetch(DEEPSEEK_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_CONFIG.MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: DEEPSEEK_CONFIG.MAX_TOKENS,
        temperature: DEEPSEEK_CONFIG.TEMPERATURE
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from DeepSeek API')
    }

    const summary = data.choices[0].message.content.trim()

    if (summary.length < 50) {
      throw new Error(`Summary too short: ${summary.length} characters`)
    }

    return {
      success: true,
      summary: summary
    }

  } catch (error) {
    console.error(`❌ Failed to generate summary for ${article.article_title}:`, error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

async function checkAndTriggerDigestBuild(supabaseClient: any, taskId: number) {
  try {
    // Check if we have enough content items for digest building
    const { data: contentItems } = await supabaseClient
      .from('content_items')
      .select('id')
      .eq('task_id', taskId)
      .eq('processing_status', 'completed')

    const { data: pendingFetch } = await supabaseClient
      .from('content_fetch_queue')
      .select('id')
      .eq('task_id', taskId)
      .eq('fetch_status', 'pending')

    // If no more pending fetches and we have content items, trigger digest build
    if ((!pendingFetch || pendingFetch.length === 0) && 
        (contentItems && contentItems.length > 0)) {
      
      console.log('🎯 Ready for digest building, triggering digest build queue')
      
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/queue-digest-build`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: taskId })
      })
    }
  } catch (error) {
    console.error('Failed to trigger digest build:', error)
  }
} 