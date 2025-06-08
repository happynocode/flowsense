// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface ValidationResult {
  valid: boolean;
  message: string;
  details?: {
    isRSS?: boolean;
    contentType?: string;
    feedTitle?: string;
  };
}

console.log("Validate Source Edge Function loaded!")

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
    // Parse request body
    const { url } = await req.json()
    
    if (!url) {
      throw new Error('URL is required')
    }

    console.log('🔍 Validating source URL:', url)

    const result = await validateSourceUrl(url)

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
    console.error('❌ Source validation failed:', error)
    
    const errorResult: ValidationResult = {
      valid: false,
      message: error instanceof Error ? error.message : 'Unknown error'
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

// Validate source URL
async function validateSourceUrl(url: string): Promise<ValidationResult> {
  try {
    // Basic URL format validation
    let urlObj: URL
    try {
      urlObj = new URL(url)
    } catch (error) {
      return {
        valid: false,
        message: 'Invalid URL format'
      }
    }

    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        message: 'URL must use HTTP or HTTPS protocol'
      }
    }

    console.log('🔍 Checking RSS patterns for:', url)
    
    // Check for RSS patterns in URL
    const lowerUrl = url.toLowerCase()
    const rssPatterns = [
      '/feed', '/rss', '.xml', '/atom', 
      '/feed/', '/rss/', '/feeds/', 
      '/atom.xml', '/rss.xml', '/feed.xml',
      '/rss2/', '/rdf', '/feed.atom'
    ]
    
    const hasRSSPattern = rssPatterns.some(pattern => lowerUrl.includes(pattern))
    
    if (hasRSSPattern) {
      console.log('✅ URL contains RSS pattern')
      return {
        valid: true,
        message: 'Valid RSS feed URL detected',
        details: {
          isRSS: true
        }
      }
    }

    // Try to fetch and validate content
    try {
      console.log('🌐 Fetching URL content for validation...')
      
      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD to avoid downloading full content
        headers: {
          'User-Agent': 'Daily Digest RSS Validator/1.0'
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        return {
          valid: false,
          message: `URL returned ${response.status}: ${response.statusText}`
        }
      }

      const contentType = response.headers.get('content-type') || ''
      
      // Check content type for RSS/XML indicators
      const rssContentTypes = [
        'application/rss+xml',
        'application/atom+xml',
        'application/xml',
        'text/xml',
        'application/rdf+xml'
      ]
      
      const isRSSContentType = rssContentTypes.some(type => 
        contentType.toLowerCase().includes(type)
      )
      
      if (isRSSContentType) {
        return {
          valid: true,
          message: 'Valid RSS feed detected by content type',
          details: {
            isRSS: true,
            contentType
          }
        }
      }

      // If content type is HTML or generic, it might still be RSS
      if (contentType.includes('text/html') || contentType.includes('text/plain')) {
        return {
          valid: true,
          message: 'URL accessible - may contain RSS feed',
          details: {
            isRSS: false,
            contentType
          }
        }
      }

      return {
        valid: true,
        message: 'URL is accessible but RSS format unclear',
        details: {
          isRSS: false,
          contentType
        }
      }

    } catch (fetchError) {
      console.error('❌ Failed to fetch URL:', fetchError)
      
      if (fetchError instanceof Error && fetchError.name === 'TimeoutError') {
        return {
          valid: false,
          message: 'URL request timed out - server may be slow or unreachable'
        }
      }
      
      return {
        valid: false,
        message: `Failed to access URL: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`
      }
    }

  } catch (error) {
    console.error('❌ Validation error:', error)
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

/* To invoke locally:

  1. Run `supabase start`