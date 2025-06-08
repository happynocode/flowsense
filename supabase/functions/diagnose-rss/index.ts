import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts"

interface DiagnosticResult {
  url: string;
  steps: {
    step: string;
    success: boolean;
    duration: number;
    data?: any;
    error?: string;
  }[];
  totalDuration: number;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  const testUrls = [
    'https://techcrunch.com/feed/',
    'https://lethain.com/feeds/',
    'https://lexfridman.com/feed/podcast/'
  ]

  const results: DiagnosticResult[] = []

  for (const url of testUrls) {
    const startTime = Date.now()
    const steps: DiagnosticResult['steps'] = []
    
    console.log(`🔍 Diagnosing: ${url}`)

    // Step 1: Basic fetch test
    let stepStart = Date.now()
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml,*/*',
        },
        redirect: 'follow',
      })
      
      const content = await response.text()
      
      steps.push({
        step: 'Basic Fetch',
        success: response.ok,
        duration: Date.now() - stepStart,
        data: {
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: content.length,
          preview: content.substring(0, 200)
        }
      })

      if (!response.ok) continue

      // Step 2: RSS Detection
      stepStart = Date.now()
      const contentType = response.headers.get('content-type') || ''
      const lowerContent = content.toLowerCase()
      const isRSS = contentType.includes('rss') || contentType.includes('atom') || contentType.includes('xml') ||
                   lowerContent.includes('<rss') || lowerContent.includes('<feed')
      
      steps.push({
        step: 'RSS Detection',
        success: isRSS,
        duration: Date.now() - stepStart,
        data: { isRSS, contentType }
      })

      if (!isRSS) continue

      // Step 3: DOM Parsing
      stepStart = Date.now()
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(content, 'text/html')
        const items = doc.querySelectorAll('item')
        
        steps.push({
          step: 'DOM Parsing',
          success: true,
          duration: Date.now() - stepStart,
          data: { itemsFound: items.length }
        })
      } catch (error) {
        steps.push({
          step: 'DOM Parsing',
          success: false,
          duration: Date.now() - stepStart,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Step 4: Regex Parsing
      stepStart = Date.now()
      try {
        const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
        const items = content.match(itemRegex) || []
        
        steps.push({
          step: 'Regex Parsing',
          success: items.length > 0,
          duration: Date.now() - stepStart,
          data: { itemsFound: items.length }
        })
      } catch (error) {
        steps.push({
          step: 'Regex Parsing',
          success: false,
          duration: Date.now() - stepStart,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

    } catch (error) {
      steps.push({
        step: 'Basic Fetch',
        success: false,
        duration: Date.now() - stepStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    results.push({
      url,
      steps,
      totalDuration: Date.now() - startTime
    })
  }

  return new Response(
    JSON.stringify({ results }, null, 2),
    { headers: CORS_HEADERS }
  )
}) 