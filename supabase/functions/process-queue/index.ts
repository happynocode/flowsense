import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BATCH_SIZE = 20

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('⚙️ Starting queue processing (fast, async dispatch mode)...')

    // 1. Atomically fetch and update a batch of items to prevent race conditions.
    const { data: itemsToProcess, error: rpcError } = await supabaseClient
      .rpc('get_and_lock_pending_items', { batch_size: BATCH_SIZE })
    
    if (rpcError) {
      console.error('❌ Failed to fetch items from queue:', rpcError)
      throw rpcError
    }

    if (!itemsToProcess || itemsToProcess.length === 0) {
      console.log('✅ No pending items to process - all content items may already be processed or no new content available')
      return new Response(JSON.stringify({ success: true, message: 'No pending items to process.' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`📋 Found ${itemsToProcess.length} items to process. Dispatching asynchronously...`)
    
    // 2. Fire-and-forget the process-content function for each item
    // We do NOT await these promises. This ensures the function returns quickly.
    for (const item of itemsToProcess) {
      console.log(`🚀 Dispatching process-content for item ${item.id}`)
      supabaseClient.functions.invoke('process-content', {
        body: { contentItemId: item.id }
      }).catch(error => {
        // This catch is for cases where the invocation itself fails network-wise
        console.error(`❌ Function invocation for item ${item.id} failed:`, error.message)
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully dispatched processing for ${itemsToProcess.length} items.`
    }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Queue processor (dispatch mode) error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}) 