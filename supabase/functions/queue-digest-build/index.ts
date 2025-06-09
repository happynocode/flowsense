import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPSEEK_CONFIG = {
  API_URL: 'https://api.deepseek.com/v1/chat/completions',
  MODEL: 'deepseek-chat',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.4
}

interface ContentItem {
  id: number
  title: string
  description: string
  url: string
  published_date: string
  source_name: string
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { task_id } = await req.json()

  if (!task_id) {
    return new Response('Missing task_id', { status: 400 })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    console.log(`🏗️ Digest Build Queue - Building digest for task ${task_id}`)

    // Get all completed content items for this task
    const { data: contentItems, error: itemsError } = await supabaseClient
      .from('content_items')
      .select(`
        id,
        title,
        description,
        url,
        published_date,
        content_sources!inner(name)
      `)
      .eq('task_id', task_id)
      .eq('processing_status', 'completed')
      .order('published_date', { ascending: false })

    if (itemsError) {
      throw new Error(`Failed to fetch content items: ${itemsError.message}`)
    }

    if (!contentItems || contentItems.length === 0) {
      console.log('⚠️ No content items found for digest building')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No content items found' 
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log(`📚 Building digest from ${contentItems.length} content items`)

    // Group content by source
    const contentBySource = new Map<string, ContentItem[]>()
    
    contentItems.forEach(item => {
      const sourceName = (item.content_sources as any).name
      if (!contentBySource.has(sourceName)) {
        contentBySource.set(sourceName, [])
      }
      contentBySource.get(sourceName)!.push({
        id: item.id,
        title: item.title,
        description: item.description,
        url: item.url,
        published_date: item.published_date,
        source_name: sourceName
      })
    })

    // Generate overall digest
    const overallDigest = await generateOverallDigest(Array.from(contentBySource.values()).flat())

    if (!overallDigest.success) {
      throw new Error(`Failed to generate overall digest: ${overallDigest.error}`)
    }

    // Save overall digest
    const { data: digestResult, error: digestError } = await supabaseClient
      .from('content_summaries')
      .insert({
        task_id: task_id,
        summary_type: 'overall',
        content: overallDigest.content,
        item_count: contentItems.length,
        source_id: null
      })
      .select()

    if (digestError) {
      throw new Error(`Failed to save digest: ${digestError.message}`)
    }

    console.log(`✅ Overall digest created with ${contentItems.length} items`)

    // Update task status to completed
    await supabaseClient
      .from('processing_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: {
          total_sources: contentBySource.size,
          total_items: contentItems.length,
          digest_id: digestResult[0].id
        }
      })
      .eq('id', task_id)

    console.log(`🎉 Task ${task_id} completed successfully!`)

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task_id,
        total_items: contentItems.length,
        total_sources: contentBySource.size,
        digest_id: digestResult[0].id
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Digest build queue error:', error)

    // Update task status to failed
    await supabaseClient
      .from('processing_tasks')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', task_id)

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

async function generateOverallDigest(items: ContentItem[]): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    console.log(`🧠 Generating overall digest for ${items.length} items`)

    // Prepare content summary for AI
    const contentSummary = items.map((item, index) => {
      return `${index + 1}. **${item.title}** (${item.source_name})
${item.description}
发布时间: ${new Date(item.published_date).toLocaleDateString('zh-CN')}
---`
    }).join('\n\n')

    const prompt = `请基于以下${items.length}篇文章生成一份综合性的每周技术摘要：

${contentSummary}

请按以下格式生成摘要：

# 本周技术动态摘要

## 🔥 重点关注
（列出本周最重要的3-5个技术动态）

## 💡 技术趋势
（分析本周技术发展趋势）

## 📊 行业洞察  
（提供行业层面的观察和分析）

## 🎯 值得关注的项目/公司
（如果有的话）

要求：
1. 使用中文输出
2. 内容要有深度和洞察力
3. 结构清晰，易于阅读
4. 总字数控制在800-1200字`

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

    const digest = data.choices[0].message.content.trim()

    if (digest.length < 200) {
      throw new Error(`Digest too short: ${digest.length} characters`)
    }

    return {
      success: true,
      content: digest
    }

  } catch (error) {
    console.error('❌ Failed to generate overall digest:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
} 