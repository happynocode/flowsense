import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BATCH_SIZE = 20

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('⚙️ Starting queue processing...')

    // 1. Atomically fetch and update a batch of items to prevent race conditions.
    const { data: itemsToProcess, error: rpcError } = await supabaseClient
      .rpc('get_and_lock_pending_items', { batch_size: BATCH_SIZE })
    
    if (rpcError) {
      console.error('❌ Failed to fetch items from queue:', rpcError)
      throw rpcError
    }

    if (!itemsToProcess || itemsToProcess.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No pending items to process.' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`📋 Found ${itemsToProcess.length} items to process in this batch.`)
    
    // 2. Fire-and-forget the process-content function for each item
    for (const item of itemsToProcess) {
      console.log(`🚀 Triggering process-content for item ${item.id}`)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contentItemId: item.id })
      }).catch(error => {
        console.error(`❌ Background trigger for item ${item.id} failed:`, error.message)
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully triggered processing for ${itemsToProcess.length} items.`
    }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Queue processor error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}) 