// This is a test function for debugging RSS feeds
// No authentication required for testing purposes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

interface CorsHeaders {
  'Access-Control-Allow-Origin': string
  'Access-Control-Allow-Headers': string
  'Access-Control-Allow-Methods': string
  'Access-Control-Max-Age': string
}

const corsHeaders: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { url } = requestBody
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 Testing RSS feed:', url)
    
    // Fetch the RSS content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const content = await response.text()
    
    console.log('📄 Response status:', response.status)
    console.log('📄 Content-Type:', response.headers.get('Content-Type'))
    console.log('📄 Content length:', content.length)
    console.log('📄 Content preview:', content.substring(0, 1000))

    // Parse the content
    const parser = new DOMParser()
    let doc: Document | null = null
    
    // Clean the XML content first
    let cleanedXml = content.trim()
    cleanedXml = cleanedXml.replace(/^\uFEFF/, '')
    cleanedXml = cleanedXml.replace(/^[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/, '')
    
    const mimeTypes = ['application/xml', 'text/html', 'application/xhtml+xml', 'text/xml']
    let successfulMimeType = ''
    
    for (const mimeType of mimeTypes) {
      try {
        console.log(`🔄 Trying to parse with MIME type: ${mimeType}`)
        doc = parser.parseFromString(cleanedXml, mimeType as any)
        
        if (doc) {
          const docElement = doc.documentElement
          console.log('📋 Document element tag:', docElement?.tagName)
          console.log('📋 Document has rss:', !!doc.querySelector('rss'))
          console.log('📋 Document has feed:', !!doc.querySelector('feed'))
          console.log('📋 Document has channel:', !!doc.querySelector('channel'))
          
          if (doc.querySelector('rss') || doc.querySelector('feed') || doc.querySelector('channel') || 
              docElement?.tagName === 'rss' || docElement?.tagName === 'feed') {
            console.log(`✅ Successfully parsed XML with MIME type: ${mimeType}`)
            successfulMimeType = mimeType
            break
          }
        }
      } catch (error) {
        console.log(`❌ Failed to parse with MIME type ${mimeType}:`, error)
        continue
      }
    }

    if (!doc) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse XML',
          content: content.substring(0, 500),
          contentType: response.headers.get('Content-Type')
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Try to parse articles
    let articles = []
    
    // Try RSS 2.0 format first
    const items = doc.querySelectorAll('item')
    console.log('🔍 Found', items.length, 'RSS items')
    
    if (items.length > 0) {
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const item = items[i]
        const title = item.querySelector('title')?.textContent?.trim()
        const linkElement = item.querySelector('link')
        let link = linkElement?.textContent?.trim()
        
        if (!link && linkElement) {
          link = linkElement.getAttribute('href')?.trim()
        }
        
        const pubDate = item.querySelector('pubDate')?.textContent?.trim()
        const description = item.querySelector('description')?.textContent?.trim()
        
        console.log(`📰 Item ${i + 1}:`)
        console.log(`   Title: "${title}"`)
        console.log(`   Link: "${link}"`)
        console.log(`   PubDate: "${pubDate}"`)
        console.log(`   Description length: ${description?.length || 0}`)
        
        if (title && link) {
          articles.push({
            title,
            link,
            pubDate,
            description: description?.substring(0, 200) + '...'
          })
        }
      }
    } else {
      // Try Atom format
      const entries = doc.querySelectorAll('entry')
      console.log('🔍 Found', entries.length, 'Atom entries')
      
      for (let i = 0; i < Math.min(entries.length, 5); i++) {
        const entry = entries[i]
        const title = entry.querySelector('title')?.textContent?.trim()
        const linkElement = entry.querySelector('link')
        let link = linkElement?.getAttribute('href')?.trim() || linkElement?.textContent?.trim()
        
        const published = entry.querySelector('published')?.textContent?.trim() || 
                         entry.querySelector('updated')?.textContent?.trim()
        const summary = entry.querySelector('summary')?.textContent?.trim() ||
                       entry.querySelector('content')?.textContent?.trim()

        console.log(`📰 Entry ${i + 1}:`)
        console.log(`   Title: "${title}"`)
        console.log(`   Link: "${link}"`)
        console.log(`   Published: "${published}"`)
        console.log(`   Summary length: ${summary?.length || 0}`)

        if (title && link) {
          articles.push({
            title,
            link,
            published,
            summary: summary?.substring(0, 200) + '...'
          })
        }
      }
    }

    const result = {
      success: true,
      url,
      responseStatus: response.status,
      contentType: response.headers.get('Content-Type'),
      contentLength: content.length,
      successfulMimeType,
      docElementTag: doc?.documentElement?.tagName,
      foundRSS: !!doc?.querySelector('rss'),
      foundFeed: !!doc?.querySelector('feed'),
      foundChannel: !!doc?.querySelector('channel'),
      itemCount: doc?.querySelectorAll('item').length,
      entryCount: doc?.querySelectorAll('entry').length,
      articles,
      contentPreview: content.substring(0, 500)
    }

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Test RSS failed:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 