/// <reference types="https://deno.land/x/deno@v1.44.4/runtime/plugins/dom.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('🚀 Execute-processing-task function initialized')

// Helper function to update task progress
async function updateTaskStatus(supabaseClient: any, taskId: number, status: string, result?: any) {
  const { error } = await supabaseClient
    .from('processing_tasks')
    .update({ status, result: result || undefined, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) {
    console.error(`❌ Failed to update task ${taskId} status to ${status}:`, error)
  } else {
    console.log(`✅ Task ${taskId} status updated to ${status}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let taskId: number | null = null;

  try {
    const body = await req.json()
    console.log("✅ Received request body:", body);
    taskId = body.taskId

    if (!taskId || typeof taskId !== 'number') {
      throw new Error('A valid numeric taskId is required')
    }

    console.log(`▶️ Starting execution for task: ${taskId}`)
    await updateTaskStatus(supabaseClient, taskId, 'processing')

    // 1. Get user_id from the task
    const { data: taskData, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .select('user_id, config')
      .eq('id', taskId)
      .single()

    if (taskError || !taskData) {
      throw new Error(`Task not found or failed to retrieve: ${taskError?.message || 'No data'}`)
    }
    
    const { user_id, config } = taskData;
    const timeRange = config?.time_range || 'week';
    console.log(`🧑‍💻 Task for user ${user_id} with time range '${timeRange}'.`);

    // 2. REFACTORED: Get all active sources for the user directly
    console.log(`🔍 Fetching active sources for user ${user_id}...`);
    const { data: sources, error: sourcesError } = await supabaseClient
        .from('content_sources')
        .select('id, url, name')
        .eq('user_id', user_id)
        .eq('is_active', true);
    
    if (sourcesError) {
        throw new Error(`Failed to fetch sources for user ${user_id}: ${sourcesError.message}`);
    }

    if (!sources || sources.length === 0) {
      await updateTaskStatus(supabaseClient, taskId, 'completed', { message: 'User has no active sources to process.' })
      return new Response(JSON.stringify({ success: true, message: 'No active sources to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    console.log(`📚 Task ${taskId} has ${sources.length} active sources to process.`)

    // 3. Sequentially invoke fetch-content for each source
    for (const source of sources) {
      console.log(`--- Invoking fetch-content for source: ${source.name} (ID: ${source.id}) ---`)
      try {
        const fetchResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-content`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            sourceId: source.id, 
            sourceUrl: source.url,
            sourceName: source.name,
            timeRange: timeRange
          }),
        })

        if (!fetchResponse.ok) {
          const errorBody = await fetchResponse.text()
          console.error(`❌ fetch-content for ${source.name} failed with status ${fetchResponse.status}: ${errorBody}`)
        } else {
          const result = await fetchResponse.json()
          console.log(`✅ fetch-content for ${source.name} succeeded: ${result.message}`)
        }
      } catch (e) {
        console.error(`❌ Error invoking fetch-content for ${source.name}:`, e.message)
      }
      console.log(`--- Finished fetch-content for source: ${source.name} ---`)
    }

    // 4. Get all unprocessed content items for the user from this task's sources
    console.log(`🧐 Getting all unprocessed items for user ${user_id} from this task...`)
    const sourceIds = sources.map((s: any) => s.id);
    const { data: contentItems, error: itemsError } = await supabaseClient
      .from('content_items')
      .select('id')
      .in('source_id', sourceIds)
      .eq('is_processed', false)

    if (itemsError) throw itemsError
    if (!contentItems || contentItems.length === 0) {
        console.log('✅ No new content items to process for this task.')
    } else {
        console.log(`Found ${contentItems.length} unprocessed content items to process.`)
    }

    // 5. Batch-invoke process-content
    if (contentItems && contentItems.length > 0) {
        const BATCH_SIZE = 5
        const BATCH_DELAY = 1000 // Reduced delay
        for (let i = 0; i < contentItems.length; i += BATCH_SIZE) {
            const batch = contentItems.slice(i, i + BATCH_SIZE)
            console.log(`⚙️ Processing batch ${Math.floor(i/BATCH_SIZE) + 1} with ${batch.length} items.`)
            
            const promises = batch.map(item =>
                fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-content`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ contentItemId: item.id })
                }).then(res => {
                    if(!res.ok) console.error(`Error processing item ${item.id}: ${res.statusText}`)
                    else console.log(`👍 Successfully triggered processing for item ${item.id}`)
                })
            )
            await Promise.allSettled(promises)

            if (i + BATCH_SIZE < contentItems.length) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
            }
        }
    }
    
    // 6. Final check and trigger digest generation
    console.log(`✅ All processing jobs triggered for task ${taskId}.`)
    console.log(`➡️ Triggering digest generation for user ${user_id}.`)
    
    const digestResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-digest`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user_id, timeRange: timeRange })
    })

    if (!digestResponse.ok) {
        throw new Error(`Failed to trigger digest generation: ${await digestResponse.text()}`)
    }

    await updateTaskStatus(supabaseClient, taskId, 'completed', { message: 'All jobs triggered and digest generation initiated.' })

    return new Response(JSON.stringify({ success: true, message: 'Processing complete and digest generation triggered.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(`❌ Unhandled error in execute-processing-task for task ${taskId}:`, error.message)
    if (taskId) {
        await updateTaskStatus(supabaseClient, taskId, 'failed', { error: error.message })
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}) 