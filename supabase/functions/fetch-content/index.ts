/// <reference types="https://deno.land/x/deno@v1.44.4/runtime/plugins/dom.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser, Document } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

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
  TIMEOUT_MS: 50000, // 50 seconds - should be much faster now with async processing
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

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { sourceId, sourceUrl, sourceName, timeRange = 'week', taskId } = await req.json()

    if (!sourceId || !sourceUrl) {
      return new Response('Missing sourceId or sourceUrl', { status: 400 })
    }

    console.log(`🚀 Starting content fetch for source: ${sourceName} (${sourceUrl}) [Task: ${taskId}]`)

    // Update task progress - mark as current source
    if (taskId) {
      await updateTaskProgress(supabaseClient, taskId, sourceName, 'processing')
    }

    // Wrap the main processing in a timeout
    const result = await Promise.race([
      processSource(supabaseClient, sourceId, sourceUrl, sourceName, timeRange, taskId),
      createTimeoutPromise(PROCESSING_CONFIG.TIMEOUT_MS, 'Content fetch timeout')
    ])

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Content fetch error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// =================================================================
// 网站专属抓取配置
// =================================================================
interface SiteConfig {
  scrapeUrl?: (baseUrl: string) => string;
  containerSelector: string;
  linkSelector: string;
  dateSelector?: string;
  findDateInContainer?: boolean;
}

const siteConfigs: { [key: string]: SiteConfig } = {
  'www.therundown.ai': {
    containerSelector: 'div.collection-item-div',
    linkSelector: 'a.article-preview',
    dateSelector: 'p.tertiary-text',
  },
  'every.to': {
    scrapeUrl: () => `https://every.to/everything`,
    containerSelector: 'div.mb-10',
    linkSelector: 'a[href^="/p/"]',
    dateSelector: 'div.text-sm',
  },
  'www.exponentialview.co': {
    containerSelector: 'div[id*="post-body"]',
    linkSelector: 'a[data-testid="post-preview-title"]',
    dateSelector: 'time',
  }
};

async function processSource(
  supabaseClient: any,
  sourceId: number,
  sourceUrl: string,
  sourceName: string,
  timeRange: string,
  taskId?: number
): Promise<{ success: boolean; articlesCount: number; message: string }> {
  
  try {
    const url = new URL(sourceUrl);
    const siteConfig = siteConfigs[url.hostname];

    let scrapeUrl = sourceUrl;
    if (siteConfig?.scrapeUrl) {
        scrapeUrl = siteConfig.scrapeUrl(sourceUrl);
        console.log(`🌐 Using site-specific scrape URL: ${scrapeUrl}`);
    }

    console.log(`🔍 Detecting content type for: ${scrapeUrl}`)
    
    const detection = await detectContentType(scrapeUrl)
    if (!detection) {
      const result = { success: false, articlesCount: 0, message: 'Failed to fetch content' }
      
      // Update task progress - mark as skipped
      if (taskId) {
        await updateTaskProgress(supabaseClient, taskId, sourceName, 'skipped', { error: result.message })
        await checkAndCompleteTask(supabaseClient, taskId)
      }
      
      return result
    }

    let articles: Article[] = [];
    if (detection.isRSS) {
      console.log(`📡 Processing RSS feed: ${scrapeUrl}`)
      articles = await parseRSSContent(detection.content, scrapeUrl, timeRange)
    } else {
      console.log(`📄 Non-RSS content detected. Scraping index page for articles: ${scrapeUrl}`)
      articles = await scrapeIndexPageForArticles(
        detection.content,
        scrapeUrl,
        timeRange,
        siteConfig
      );
    }
      
    if (articles.length === 0) {
      const result = { success: true, articlesCount: 0, message: 'No recent articles found' }
      
      // Update task progress - mark as completed (even if no articles)
      if (taskId) {
        await updateTaskProgress(supabaseClient, taskId, sourceName, 'completed', result)
        await checkAndCompleteTask(supabaseClient, taskId)
      }
      
      return result
    }
    
    const { queuedCount } = await queueContentProcessingJobs(supabaseClient, articles, sourceId)
    const result = { success: true, articlesCount: queuedCount, message: `Queued ${queuedCount} articles for processing` }

    // Update task progress - mark as completed
    if (taskId) {
      await updateTaskProgress(supabaseClient, taskId, sourceName, 'completed', result)
      await checkAndCompleteTask(supabaseClient, taskId)
    }
    
    return result

  } catch (error) {
    console.error(`❌ Error processing source ${sourceName}:`, error)
    const result = { success: false, articlesCount: 0, message: error.message }
    
    // Update task progress - mark as skipped due to error
    if (taskId) {
      await updateTaskProgress(supabaseClient, taskId, sourceName, 'skipped', { error: error.message })
      await checkAndCompleteTask(supabaseClient, taskId)
    }
    
    return result
  }
}

// =================================================================
// 核心逻辑：检测内容类型 (已升级为使用无头浏览器)
// =================================================================
async function detectContentType(url: string): Promise<ContentDetectionResult | null> {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    });

    console.log(`🚀 Launching headless browser to fetch: ${url}`);
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const content = await page.content();
    await browser.close();

    if (!response) {
        console.error(`❌ Headless browser failed to get a response from ${url}`);
        return null;
    }

    const contentType = response.headers()['content-type'] || '';
    const responseStatus = response.status();
    
    console.log(`✅ Fetched via headless browser. Status: ${responseStatus}, Content-Type: ${contentType}, Content Length: ${content.length}`);

    const isRSS = isRSSContent(contentType, content);

    return { isRSS, contentType, content, responseStatus };

  } catch (error) {
    console.error(`❌ Deep fetch error for ${url}:`, error);
    // Fallback to simple fetch if puppeteer fails for some reason (e.g. RSS feeds)
    try {
        console.log(` puppeteer failed, falling back to simple fetch...`);
        const res = await fetch(url, { headers: { 'Accept': 'application/xml, text/xml, application/rss+xml, text/html' } });
        if (!res.ok) {
            console.error(`❌ Fallback fetch also failed with status: ${res.status}`);
            return null;
        }
        const contentType = res.headers.get('content-type') || '';
        const content = await res.text();
        const isRSS = isRSSContent(contentType, content);
        return { isRSS, contentType, content, responseStatus: res.status };
    } catch (fallbackError) {
        console.error(`❌ Fallback fetch also failed:`, fallbackError);
        return null;
    }
  }
}

// =================================================================
// 辅助函数：判断是否为 RSS 内容
// =================================================================
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

async function scrapeIndexPageForArticles(
  htmlContent: string,
  baseUrl: string,
  timeRange: string = 'week',
  config?: SiteConfig
): Promise<Article[]> {
  const dom = new DOMParser().parseFromString(htmlContent, 'text/html');
  if (!dom) return [];

  const cutoffDate = getCutoffDate(timeRange);
  const articles: Article[] = [];
  const processedLinks = new Set<string>();

  if (config) {
    console.log(`⚙️ Using site-specific config for ${baseUrl}`);
    const containers = dom.querySelectorAll(config.containerSelector);
    console.log(`   -> Found ${containers.length} containers with selector: ${config.containerSelector}`);

    for (const container of containers) {
       if (articles.length >= PROCESSING_CONFIG.ARTICLES_PER_SOURCE) break;
       
       let linkElement: Element | null = container.matches(config.linkSelector)
         ? container
         : container.querySelector(config.linkSelector);

       if (!linkElement) {
           console.log(`   -> 🔗 Link not found in container with selector "${config.linkSelector}"`);
           continue;
       }

       const href = linkElement.getAttribute('href');
       if (!href) continue;

       const articleUrl = new URL(href, baseUrl).toString();
       if (processedLinks.has(articleUrl)) continue;

       let date: Date | null = null;
       if (config.dateSelector) {
           const dateElement = container.querySelector(config.dateSelector);
           const dateString = dateElement?.getAttribute('datetime') || dateElement?.textContent || '';
           date = flexibleDateParser(dateString);
       } else if (config.findDateInContainer) {
           date = flexibleDateParser(container.textContent || '');
       }

       if (!date || date < cutoffDate) continue;
        
       const title = linkElement.textContent?.trim().replace(/\s+/g, ' ') || 'Untitled';
       if (!title || title.length < 5) continue;

       console.log(`   -> ✅ [${date.toISOString()}] ${title} | ${articleUrl}`);
       articles.push({ title, link: articleUrl, publishedDate: date.toISOString() });
       processedLinks.add(articleUrl);
    }

  } else {
    // Fallback to the generic link-first strategy
    console.log(`🔄 No specific config found. Using generic link-first strategy for ${baseUrl}`);
    const linkSelectors = ['h2 a[href]', 'h3 a[href]', 'a[rel="bookmark"]', 'a[data-testid="post-preview-title"]'];
    const links: Element[] = [];
    linkSelectors.forEach(selector => dom.querySelectorAll(selector).forEach(link => links.push(link)));
    
    console.log(`   -> Found ${links.length} potential article links.`);

    for (const link of links) {
        if (articles.length >= PROCESSING_CONFIG.ARTICLES_PER_SOURCE) break;

        const href = link.getAttribute('href');
        if (!href) continue;
        
        const articleUrl = new URL(href, baseUrl).toString();
        if (processedLinks.has(articleUrl)) continue;

        const container = link.closest('article, li, div[class*="item"], div[class*="post"]');
        const textToSearchDate = container?.textContent || '';
        const date = flexibleDateParser(textToSearchDate);

        if (!date || date < cutoffDate) continue;

        const title = link.textContent?.trim().replace(/\s+/g, ' ') || 'Untitled';
        if (!title || title.length < 5) continue;

        console.log(`   -> ✅ [${date.toISOString()}] ${title} | ${articleUrl}`);
        articles.push({ title, link: articleUrl, publishedDate: date.toISOString() });
        processedLinks.add(articleUrl);
    }
  }


  if (articles.length === 0) {
    console.log(`⚠️ No recent articles found after scraping ${baseUrl}.`);
  }

  return articles.slice(0, PROCESSING_CONFIG.ARTICLES_PER_SOURCE);
}

// 辅助函数：根据时间范围获取截止日期
function getCutoffDate(timeRange: string): Date {
  const now = new Date();
  const daysToSubtract = timeRange === 'today' ? 2 : 7; // 'today' a bit wider
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
}

// 辅助函数：更灵活的日期解析器 (重写)
function flexibleDateParser(text: string): Date | null {
  if (!text) return null;

  // Pattern 1: ISO-like dates (YYYY-MM-DD or datetime attributes)
  let match = text.match(/\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/);
  if (match) {
    const d = new Date(match[0]);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Pattern 2: Month Day, Year (e.g., "June 8, 2025", "Jun 8 2025")
  match = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i);
  if (match) {
    const d = new Date(match[0].replace(/,/, ''));
    if (!isNaN(d.getTime())) return d;
  }

  // Pattern 3: Day Month Year (e.g., "08 June 2025", "Sun 08 June 2025")
  match = text.match(/\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i);
  if (match) {
    const d = new Date(match[0]);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

async function queueContentProcessingJobs(
  supabaseClient: any,
  articles: Article[],
  sourceId: number
): Promise<{ success: boolean; queuedCount: number }> {
  
  console.log(`📋 Queueing ${articles.length} articles for content processing`)
  
  if (articles.length === 0) {
    return { success: true, queuedCount: 0 }
  }

  try {
    // Check for existing content items to avoid duplicates
    const contentItems = articles.map(article => ({
      source_id: sourceId,
      title: article.title,
      content_url: article.link,
      published_date: article.publishedDate,
      content_text: article.description || article.content || ''
    }))

    // Try to insert content items, handling duplicates gracefully
    const { data, error } = await supabaseClient
        .from('content_items')
        .insert(contentItems)
        .select('id')

    if (error) {
        // 23505 is the error code for unique violation
        if (error.code === '23505') {
            console.log('⚠️ Some content items were duplicates, which is expected.')
            // Even with duplicates, we can consider the operation "successful"
            // We'll query to see how many were actually inserted if needed, but for now this is fine.
            const { count } = await supabaseClient.from('content_items').select('id', { count: 'exact' }).in('content_url', articles.map(a => a.link))
            return { success: true, queuedCount: count || 0 }
        } else {
            throw error;
        }
    }
    
    console.log(`✅ Successfully queued ${data?.length || 0} new content items for processing`)
    return { success: true, queuedCount: data?.length || 0 }

  } catch (error) {
    console.error('❌ Failed to queue content processing jobs:', error)
    return { success: false, queuedCount: 0 }
  }
} 