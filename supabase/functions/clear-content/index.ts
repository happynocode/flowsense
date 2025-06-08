// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

console.log("Clear Content Edge Function loaded!")

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

    console.log('🗑️ Starting to clear scraped content for user:', user.id)

    // Delete user's digests (cascade will handle digest_items)
    const { error: digestsError } = await supabaseClient
      .from('digests')
      .delete()
      .eq('user_id', user.id)

    if (digestsError) {
      console.error('❌ Failed to delete digests:', digestsError)
      throw new Error(`Failed to delete digests: ${digestsError.message}`)
    }

    // Get user's content sources to find content_items
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('content_sources')
      .select('id')
      .eq('user_id', user.id)

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (sources && sources.length > 0) {
      const sourceIds = sources.map(s => s.id)
      
      // Delete content_items (cascade will handle summaries)
      const { error: itemsError } = await supabaseClient
        .from('content_items')
        .delete()
        .in('source_id', sourceIds)

      if (itemsError) {
        console.error('❌ Failed to delete content_items:', itemsError)
        throw new Error(`Failed to delete content items: ${itemsError.message}`)
      }

      // Reset sources' last_scraped_at timestamp
      const { error: resetError } = await supabaseClient
        .from('content_sources')
        .update({ 
          last_scraped_at: null,
          error_count: 0,
          last_error: null
        })
        .eq('user_id', user.id)

      if (resetError) {
        console.error('❌ Failed to reset sources status:', resetError)
        throw new Error(`Failed to reset sources: ${resetError.message}`)
      }
    }

    console.log('✅ Successfully cleared scraped content')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully cleared scraped content'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('❌ Clear content failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/clear-content' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
