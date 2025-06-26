import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from "jsr:@b-fuze/deno-dom";
const PROCESSING_CONFIG = {
  TIMEOUT_MS: 300000,
  MAX_CONTENT_LENGTH: 50000,
  MIN_CONTENT_LENGTH: 200
};
function createTimeoutPromise(ms, errorMessage) {
  return new Promise((_, reject)=>{
    setTimeout(()=>reject(new Error(errorMessage)), ms);
  });
}
Deno.serve(async (req)=>{
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    if (req.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405
      });
    }
    const { contentItemId } = await req.json();
    if (!contentItemId) {
      return new Response('Missing contentItemId', {
        status: 400
      });
    }
    console.log(`🚀 Starting content processing for item: ${contentItemId}`);
    // Wrap the main processing in a timeout
    const result = await Promise.race([
      processContentItem(supabaseClient, contentItemId),
      createTimeoutPromise(PROCESSING_CONFIG.TIMEOUT_MS, 'Content processing timeout')
    ]);
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Content processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
async function processContentItem(supabaseClient, contentItemId) {
  try {
    console.log(`🔍 Fetching content item: ${contentItemId}`);
    // Get content item details
    const { data: contentItem, error: fetchError } = await supabaseClient.from('content_items').select(`
        *,
        source:content_sources (
          name
        )
      `).eq('id', contentItemId).single();
    if (fetchError || !contentItem) {
      console.error('❌ Failed to fetch content item:', fetchError);
      // We can't get the task_id here, so we return an error. The calling function should handle this gracefully.
      return {
        success: false,
        message: 'Content item not found'
      };
    }
    const taskId = contentItem.task_id; // Get task_id from the content_item
    console.log(`📄 Processing: "${contentItem.title}" for task ${taskId}`);
    // Check if summary already exists
    const { data: existingSummary } = await supabaseClient.from('summaries').select('id').eq('content_item_id', contentItemId).single();
    if (existingSummary) {
      console.log(`⏭️ Summary already exists for content item ${contentItemId} (summary ID: ${existingSummary.id})`);
      console.log(`📄 Skipping duplicate processing for: "${contentItem.title}"`);
      console.log(`🔗 URL: ${contentItem.content_url}`);
      // No longer triggers digest generation from here.
      return {
        success: true,
        message: 'Content already processed (duplicate skip)',
        taskId
      };
    }
    // Item is now considered processing. The lock in get_and_lock_pending_items prevents others from picking it.
    // Check if we need to fetch full content
    let fullContent = contentItem.content_text || '';
    if (!fullContent || fullContent.length < PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
      console.log(`🔍 Fetching full content from: ${contentItem.content_url}`);
      try {
        fullContent = await fetchFullArticleContent(contentItem.content_url);
      } catch (error) {
        console.log(`⚠️ Failed to fetch full content, using existing content: ${error.message}`);
        fullContent = contentItem.content_text || '';
      }
    }
    if (!fullContent || fullContent.trim().length < PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
      console.log('❌ Insufficient content for processing');
      await supabaseClient.from('content_items').update({
        is_processed: true,
        processing_error: 'Insufficient content'
      }).eq('id', contentItemId);
      return {
        success: false,
        message: 'Insufficient content',
        taskId
      };
    }
    // Update content item with full content
    await supabaseClient.from('content_items').update({
      content_text: fullContent.substring(0, PROCESSING_CONFIG.MAX_CONTENT_LENGTH)
    }).eq('id', contentItemId);
    // Generate AI summary
    console.log(`🤖 Generating AI summary for content item: ${contentItemId}`);
    const summaryResult = await generateAISummary(supabaseClient, contentItemId, fullContent, contentItem.content_url);
    if (summaryResult.success) {
      await supabaseClient.from('content_items').update({
        is_processed: true,
        processing_error: null
      }).eq('id', contentItemId);
      console.log(`✅ Successfully processed content item: ${contentItemId}`);
      console.log(`📝 Summary created and saved to database`);
      // REMOVED: No longer triggers digest generation. This is now handled by process-queue.
      return {
        success: true,
        message: 'Content processed and summarized',
        taskId
      };
    } else {
      console.error(`❌ Summary generation failed for content item ${contentItemId}:`, summaryResult.error);
      await supabaseClient.from('content_items').update({
        is_processed: true,
        processing_error: summaryResult.error || 'Summary generation failed'
      }).eq('id', contentItemId);
      return {
        success: false,
        message: summaryResult.error || 'Summary generation failed',
        taskId
      };
    }
  } catch (error) {
    console.error('❌ Content processing error:', error);
    // Attempt to fetch taskId if not already available
    let taskId;
    try {
      const { data: contentItem } = await supabaseClient.from('content_items').select('task_id').eq('id', contentItemId).single();
      taskId = contentItem?.task_id;
    } catch  {
    // Ignore errors, we just won't have the task id
    }
    // Update status to failed
    try {
      await supabaseClient.from('content_items').update({
        is_processed: true,
        processing_error: error.message
      }).eq('id', contentItemId);
    } catch (updateError) {
      console.error('❌ Failed to update error status:', updateError);
    }
    return {
      success: false,
      message: error.message,
      taskId
    };
  }
}
async function fetchFullArticleContent(articleUrl) {
  console.log(`🔍 Fetching full content from: ${articleUrl}`);
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ];
  for(let attempt = 0; attempt < userAgents.length; attempt++){
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
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const html = await response.text();
      console.log(`📝 Fetched HTML content: ${html.length} characters`);
      const content = extractTextContent(html);
      console.log(`📄 Extracted text content: ${content.length} characters`);
      if (content.length < PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
        throw new Error(`Content too short: ${content.length} characters`);
      }
      return content;
    } catch (error) {
      console.log(`❌ Attempt ${attempt + 1} failed:`, error.message);
      if (attempt === userAgents.length - 1) {
        throw error;
      }
    }
  }
  throw new Error('All attempts to fetch content failed');
}
function extractTextContent(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Remove script and style elements
    const scriptsAndStyles = doc.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation');
    scriptsAndStyles.forEach((el)=>el.remove());
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
    ];
    let content = '';
    for (const selector of contentSelectors){
      const element = doc.querySelector(selector);
      if (element) {
        content = element.textContent || element.innerText || '';
        if (content.length > PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
          console.log(`✅ Found content using selector: ${selector}`);
          break;
        }
      }
    }
    // Fallback to body if no good content found
    if (content.length < PROCESSING_CONFIG.MIN_CONTENT_LENGTH) {
      const body = doc.querySelector('body');
      content = body?.textContent || body?.innerText || '';
      console.log('📄 Using body content as fallback');
    }
    // Clean up the content
    content = content.replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
    .trim();
    return content;
  } catch (error) {
    console.error('❌ Failed to extract text content:', error);
    return '';
  }
}
async function generateAISummary(supabaseClient, contentItemId, content, originalUrl) {
  console.log(`🤖 Generating summary for URL: ${originalUrl}`);
  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in Supabase secrets.');
    }
    const result = await callGeminiAPI(content, apiKey);
    console.log(`💾 Inserting summary into database for content item ${contentItemId}`);
    const { error: insertError } = await supabaseClient.from('summaries').insert({
      content_item_id: contentItemId,
      summary_text: result.summaryText,
      model_used: result.modelUsed
    });
    if (insertError) {
      console.error('❌ Failed to insert summary into database:', insertError);
      console.error('❌ Insert error details:', JSON.stringify(insertError, null, 2));
      return {
        success: false,
        error: `Failed to save summary: ${insertError.message}`
      };
    }
    console.log(`✅ Summary successfully inserted into database for content item ${contentItemId}`);
    return {
      success: true
    };
  } catch (error) {
    console.error('❌ AI summary generation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
async function callGeminiAPI(content, apiKey) {
  const models = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-preview-06-17', 
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite'
  ];

  // Preprocess content to ensure it's suitable for analysis
  const cleanContent = preprocessContent(content);
  
  // Check if content is suitable for analysis
  if (cleanContent.length < 100) {
    console.log(`❌ Content after preprocessing is too short: ${cleanContent.length} characters`);
    console.log(`🔍 Original content length: ${content.length} characters`);
    console.log(`📋 Cleaned content preview: "${cleanContent.substring(0, 200)}..."`);
    throw new Error(`Content too short for meaningful analysis. After cleaning: ${cleanContent.length} chars, need at least 100 chars.`);
  }

  console.log(`✅ Content preprocessed successfully: ${content.length} → ${cleanContent.length} characters`);

  const prompt = `Extract 2-5 key points from the following article content. Each point should be 1-2 sentences and help readers quickly understand the main content.

Output exactly the key points with bullet points, without any introductory text or numbering. Use **bold** to highlight important keywords or phrases in each point.

Example format:
• The study found that **artificial intelligence** significantly improves **healthcare diagnostics** by reducing error rates by 40%.
• Researchers discovered **quantum computing** could solve **optimization problems** 1000 times faster than classical computers.

Article content:
${cleanContent}`;

  let lastError;
  
  for (const model of models) {
    try {
      console.log(`🤖 Trying Gemini model: ${model}`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          console.log(`✅ Successfully used model: ${model}`);
          return {
            summaryText: data.candidates[0].content.parts[0].text.trim(),
            modelUsed: model
          };
        }
      }

      const errorBody = await response.text();
      lastError = new Error(`Gemini API request failed for model ${model} with status ${response.status}: ${errorBody}`);
      console.log(`❌ Model ${model} failed:`, lastError.message);
      
    } catch (error) {
      lastError = error;
      console.log(`❌ Model ${model} failed:`, error.message);
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

function preprocessContent(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove common patterns that indicate metadata rather than article content
  const metadataPatterns = [
    /^\d+\s+points?\s*$/gmi,           // "123 points"
    /^\d+\s+comments?\s*$/gmi,         // "456 comments"
    /^https?:\/\/[^\s]+$/gmi,          // Standalone URLs
    /^reddit\.com\/[^\s]*$/gmi,        // Reddit URLs
    /^Posted by\s+.+$/gmi,             // "Posted by username"
    /^Share this:.*$/gmi,              // "Share this:" lines
    /^Tags?:\s*.+$/gmi,                // "Tags: tag1, tag2"
    /^Categories?:\s*.+$/gmi,          // "Categories: cat1, cat2"
    /^Filed under\s*.+$/gmi,           // "Filed under category"
    /^\d+\s+(minute|hour|day|week|month|year)s?\s+ago$/gmi, // "5 minutes ago"
  ];

  let cleanContent = content;
  
  // Remove metadata patterns
  metadataPatterns.forEach(pattern => {
    cleanContent = cleanContent.replace(pattern, '');
  });

  // Remove excessive whitespace and normalize
  cleanContent = cleanContent
    .replace(/\s+/g, ' ')             // Multiple spaces to single space
    .replace(/\n\s*\n/g, '\n')        // Multiple newlines to single newline
    .replace(/^\s+|\s+$/g, '')        // Trim
    .replace(/^[\s\n]*/, '')          // Remove leading whitespace/newlines
    .replace(/[\s\n]*$/, '');         // Remove trailing whitespace/newlines

  // If content is still very short or looks like just metadata, 
  // try to extract meaningful sentences
  if (cleanContent.length < 200) {
    const sentences = content.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && !s.match(/^\d+\s+(points?|comments?)/i))
      .filter(s => !s.match(/^https?:\/\//))
      .filter(s => s.includes(' '));  // Must contain at least one space (likely a sentence)
    
    cleanContent = sentences.join('. ').trim();
  }

  return cleanContent;
}
