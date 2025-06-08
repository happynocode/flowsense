// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

// Helper function to check if URL is RSS feed
async function checkIfRSSFeed(url: string): Promise<boolean> {
  try {
    console.log('🔍 Checking if RSS feed:', url)
    
    const lowerUrl = url.toLowerCase()
    const rssPatterns = [
      '/feed', '/rss', '.xml', '/atom', 
      '/feed/', '/rss/', '/feeds/', 
      '/atom.xml', '/rss.xml', '/feed.xml'
    ]
    
    // Quick pattern check first
    const hasRSSPattern = rssPatterns.some(pattern => lowerUrl.includes(pattern))
    if (hasRSSPattern) {
      console.log('✅ URL contains RSS pattern')
      return true
    }

    // For now, assume URLs without obvious patterns might still be RSS
    // In production, you might want to fetch and parse the content
    console.log('⚠️ URL does not contain obvious RSS patterns, skipping')
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

    // Generate recent articles (mock data for now)
    const articles = generateRecentArticles(feedUrl, sourceName)
    
    let summariesCount = 0

    for (const article of articles) {
      try {
        // Get full article content
        const fullContent = await fetchFullArticleContent(article.link, sourceName)
        
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

        // Generate simple summary
        const summaryResult = await generateSimpleSummary(
          supabaseClient, 
          contentItem.id, 
          fullContent, 
          article.link
        )
        
        if (summaryResult) {
          summariesCount++
        }

      } catch (error) {
        console.error('❌ Failed to process article:', article.title, error)
        continue
      }
    }

    return {
      success: true,
      articlesCount: articles.length,
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

// Generate recent articles (mock implementation)
function generateRecentArticles(feedUrl: string, sourceName: string): Article[] {
  const lowerUrl = feedUrl.toLowerCase()
  const articlesCount = Math.floor(Math.random() * 4) + 2 // 2-5 articles
  const articles: Article[] = []

  // Generate articles from the past week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  for (let i = 0; i < articlesCount; i++) {
    const daysAgo = Math.floor(Math.random() * 7)
    const publishDate = new Date()
    publishDate.setDate(publishDate.getDate() - daysAgo)

    let article

    if (lowerUrl.includes('waitbutwhy')) {
      const baseUrl = 'https://waitbutwhy.com'
      const slugs = ['ai-revolution-road-to-superintelligence', 'neuralink-and-the-brains-magical-future', 'the-fermi-paradox', 'putting-time-in-perspective', 'everything-you-should-know-about-sound']
      const slug = slugs[i % slugs.length]
      article = {
        title: `The AI Revolution: Understanding Machine Intelligence - Part ${i + 1}`,
        link: `${baseUrl}/${slug}-${Date.now()}-${i}`,
        publishedDate: publishDate.toISOString()
      }
    } else if (lowerUrl.includes('lexfridman')) {
      const baseUrl = 'https://lexfridman.com'
      const guests = ['elon-musk', 'sam-altman', 'demis-hassabis', 'yann-lecun', 'geoffrey-hinton']
      const guest = guests[i % guests.length]
      article = {
        title: `${guest.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}: AI, Technology, and the Future | Lex Fridman Podcast #${400 + i}`,
        link: `${baseUrl}/${guest}-${400 + i}`,
        publishedDate: publishDate.toISOString()
      }
    } else if (lowerUrl.includes('substack')) {
      const urlParts = feedUrl.split('.')
      const authorName = urlParts[0].replace('https://', '')
      const baseUrl = `https://${authorName}.substack.com`
      const topics = ['ai-tools-guide', 'productivity-hacks', 'technology-trends', 'future-of-work', 'innovation-insights']
      const topic = topics[i % topics.length]
      article = {
        title: `How to Master ${topic.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} in 2024: A Comprehensive Guide`,
        link: `${baseUrl}/p/${topic}-${Date.now()}-${i}`,
        publishedDate: publishDate.toISOString()
      }
    } else {
      // Default format for other sources
      try {
        const urlObj = new URL(feedUrl)
        const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`
        const topics = ['technology-insights', 'industry-analysis', 'market-trends', 'innovation-report', 'expert-opinion']
        const topic = topics[i % topics.length]
        article = {
          title: `${topic.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} ${i + 1}: Latest Developments`,
          link: `${baseUrl}/${topic}-${Date.now()}-${i}`,
          publishedDate: publishDate.toISOString()
        }
      } catch (error) {
        article = {
          title: `Technology Insights ${i + 1}: Latest Trends and Developments`,
          link: `https://example.com/tech-insights-${Date.now()}-${i}`,
          publishedDate: publishDate.toISOString()
        }
      }
    }

    articles.push(article)
  }

  return articles
}

// Fetch full article content (mock implementation)
async function fetchFullArticleContent(articleUrl: string, sourceName: string): Promise<string> {
  // Return mock content based on source type
  if (articleUrl.includes('waitbutwhy')) {
    return `The landscape of artificial intelligence is evolving at an unprecedented pace, fundamentally reshaping how we understand intelligence itself. As we stand at the threshold of artificial general intelligence (AGI), we must grapple with questions that will define the future of human civilization.

The current state of AI development reveals a fascinating paradox: while we've achieved remarkable breakthroughs in narrow AI applications, the path to general intelligence remains shrouded in uncertainty. Large language models demonstrate impressive capabilities in language understanding and generation, yet they lack the comprehensive reasoning abilities that characterize human intelligence.

Consider the implications of recursive self-improvement - the theoretical point where AI systems become capable of enhancing their own capabilities. This concept suggests that once we create machines smarter than humans, they could design even better machines, leading to an "intelligence explosion" that could rapidly surpass human cognitive abilities across all domains.

The technical challenges are immense. Current AI systems excel in pattern recognition and statistical inference but struggle with causal reasoning, common sense understanding, and the kind of flexible problem-solving that humans take for granted. The gap between narrow AI and general intelligence may be larger than many optimists believe.

From a safety perspective, the alignment problem looms large. How do we ensure that superintelligent systems remain aligned with human values and goals? This work emphasizes the importance of uncertainty about human preferences - AI systems should be uncertain about what we want and should seek to learn our preferences rather than optimizing for fixed objectives.

The economic implications are equally profound. AI automation could eliminate millions of jobs while creating new forms of economic value. The transition period may be particularly challenging, requiring new social safety nets and potentially fundamental changes to our economic systems.`
  } else {
    return `This comprehensive analysis explores the intersection of technology, innovation, and societal change in the modern era. The discussion reveals how emerging technologies are reshaping industries, creating new opportunities, and presenting both challenges and solutions for complex global problems.

The technological landscape continues to evolve rapidly, with artificial intelligence, machine learning, and automation driving unprecedented changes across sectors. These developments are not occurring in isolation but are part of a broader transformation that affects how we work, communicate, and solve problems.

Key themes emerge from this analysis: the importance of adaptability in rapidly changing environments, the need for ethical frameworks to guide technological development, and the critical role of education and skills development in preparing for future challenges.

The implications for businesses and individuals are significant. Organizations must develop new capabilities and strategies to remain competitive, while individuals need to continuously update their skills and knowledge to stay relevant in an evolving job market.

Looking ahead, the successful integration of new technologies with human capabilities will be crucial for maximizing benefits while minimizing potential risks. This requires thoughtful planning, stakeholder engagement, and a commitment to responsible innovation that considers long-term consequences.

The path forward involves balancing technological advancement with human values, ensuring that progress serves the broader interests of society while addressing legitimate concerns about privacy, security, and equity in access to new opportunities.`
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
    
    let summaryText: string
    
    if (deepseekApiKey) {
      // Use actual DeepSeek API
      summaryText = await callDeepSeekAPI(content, deepseekApiKey)
    } else {
      // Use local mock summary
      summaryText = createSimpleSummary(content, originalUrl)
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
        model_used: deepseekApiKey ? 'deepseek-chat' : 'local-mock'
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
            content: '你是一个专业的内容摘要助手。请将文章内容总结为结构化的摘要，包含关键主题、要点和见解。使用中文回复。'
          },
          {
            role: 'user',
            content: `请总结以下文章内容，提取3-5个关键主题，每个主题包含简洁的描述和要点：\n\n${content.substring(0, 8000)}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content

  } catch (error) {
    console.error('❌ DeepSeek API call failed:', error)
    // Fallback to local summary
    throw error
  }
}

// Create simple local summary
function createSimpleSummary(content: string, originalUrl: string): string {
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .slice(0, 5)
  
  if (sentences.length === 0) {
    return `## 内容摘要

本文讨论了当前技术发展的重要主题，提供了对相关领域的深入见解和分析。内容涵盖了多个关键方面，有助于理解当前趋势和未来发展方向。

**要点总结：**
- 技术创新的重要进展
- 当前趋势的深度分析  
- 未来发展的考量和展望

原文链接：${originalUrl}`
  }

  let summary = '## 核心主题\n\n'
  
  if (sentences.length > 0) {
    summary += `1. **技术发展与创新**：文章探讨了前沿技术发展及其对社会的变革性影响。这些创新代表了我们处理复杂问题和创造价值方式的根本转变。讨论强调了变化的加速步伐以及在不断发展的技术环境中采用适应性策略的必要性。\n\n`
    summary += `   关键引述："${sentences[0]}"\n\n`
  }
  
  if (sentences.length > 1) {
    summary += `2. **实际应用与现实影响**：内容审视了理论概念如何转化为切实的益处和实用解决方案。这一主题强调了缩小创新与实施之间差距的重要性，展示了新技术如何应对现实世界的挑战。\n\n`
    summary += `   关键引述："${sentences[1]}"\n\n`
  }
  
  if (sentences.length > 2) {
    summary += `3. **未来展望与战略考量**：文章探讨了长期趋势及其对各利益相关者的潜在影响。这种分析帮助读者理解当前发展的更广泛背景及其随时间推移的轨迹。\n\n`
    summary += `   关键引述："${sentences[2]}"\n\n`
  }
  
  summary += `原文链接：${originalUrl}`
  
  return summary
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
