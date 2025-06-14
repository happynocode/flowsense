// FULL FILE REPLACEMENT: This file has been cleaned up to remove old and conflicting functions.
// All logic is now contained within the Deno.serve handler.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../shared/cors.ts'
import { updateTaskStatus } from '../shared/utils.ts'

// Configuration for batch processing
const PROCESSING_CONFIG = {
  TIMEOUT_MS: 10000, // 10 seconds - just for orchestration
}

// Helper function to create timeout promise
function createTimeoutPromise<T>(ms: number, errorMessage: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
}

console.log('🚀 Execute-processing-task function initialized')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json().catch(() => ({})) // Handle empty body case
    let { taskId, userId, timeRange } = body

    // Fallback: If userId and taskId are missing, get user from JWT
    if (!taskId && !userId) {
      console.log('🧐 No taskId or userId in body, trying to get user from JWT...')
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const jwt = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabaseClient.auth.getUser(jwt)
        if (user) {
          console.log(`👤 Found user ${user.id} from JWT.`)
          userId = user.id
        }
      }
    }

    if (!taskId && !userId) {
      throw new Error('Could not determine taskId or userId from request body or JWT.')
    }

    // --- Direct Processing Mode ---
    if (userId) {
      console.log(`▶️ Starting DIRECT processing for user: ${userId}`)
      if (!timeRange) {
        timeRange = 'week' // Default time range for direct processing
      }
      
      // 1. Get sources count for the new task
      const { data: sources, error: sourcesError } = await supabaseClient
        .from('content_sources')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
      
      if (sourcesError) throw sourcesError;
      const sourcesCount = sources?.length || 0;

      // 2. Create a new task in the database
      const { data: newTask, error: taskError } = await supabaseClient
        .from('processing_tasks')
        .insert({
          user_id: userId,
          task_type: 'process_all_sources_direct',
          status: 'pending',
          config: { time_range: timeRange },
          progress: {
            current: 0,
            total: sourcesCount,
            processed_sources: [],
            skipped_sources: []
          }
        })
        .select()
        .single()
      
      if (taskError) throw taskError;
      
      taskId = newTask.id
      console.log(`✅ Created new task ${taskId} for direct processing.`)
    }
    
    // --- Task-based Processing (continues from both modes) ---
    console.log(`▶️ Executing task: ${taskId}`)

    const { data: taskData, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .select('user_id, config')
      .eq('id', taskId)
      .single()

    if (taskError || !taskData) throw new Error(`Task ${taskId} not found.`);
    
    const finalUserId = taskData.user_id;
    const finalTimeRange = taskData.config?.time_range || 'week';
    
    const { data: sources, error: sourcesError } = await supabaseClient
        .from('content_sources')
        .select('id, url, name')
        .eq('user_id', finalUserId)
        .eq('is_active', true);
    
    if (sourcesError) throw new Error(`Failed to fetch sources for user ${finalUserId}: ${sourcesError.message}`);

    if (!sources || sources.length === 0) {
      await updateTaskStatus(supabaseClient, taskId, 'completed', { message: 'User has no active sources to process.' })
      return new Response(JSON.stringify({ success: true, message: 'No active sources to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // --- NEW: Queueing Logic ---
    // Instead of calling fetch-content directly, we queue jobs.
    const fetchJobs = sources.map(source => ({
      task_id: taskId,
      source_id: source.id,
      user_id: finalUserId,
      time_range: finalTimeRange,
    }));

    const { error: insertError } = await supabaseClient
      .from('source_fetch_jobs')
      .insert(fetchJobs);

    if (insertError) {
      console.error(`❌ Failed to insert fetch jobs for task ${taskId}:`, insertError);
      await updateTaskStatus(supabaseClient, taskId, 'failed', { error: 'Failed to queue fetch jobs.' });
      throw new Error(`Failed to queue fetch jobs: ${insertError.message}`);
    }

    // The task is now considered "processing" because the fetch jobs have been queued.
    await updateTaskStatus(supabaseClient, taskId, 'processing', { 
      message: `Successfully queued ${sources.length} sources for fetching.` 
    })

    console.log(`🚀 Triggering process-fetch-queue to start processing jobs...`)
    
    // Immediately trigger the queue processor to start working on the jobs
    try {
      const { data: queueResult, error: queueError } = await supabaseClient.functions.invoke('process-fetch-queue', {
        body: {}
      });
      
      if (queueError) {
        console.error('❌ Failed to trigger process-fetch-queue:', queueError);
      } else {
        console.log('✅ Successfully triggered process-fetch-queue:', queueResult);
      }
    } catch (error) {
      console.error('❌ Error triggering process-fetch-queue:', error);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully queued ${sources.length} sources for fetching for task ${taskId} and triggered processing.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error(`❌ Unhandled error in execute-processing-task:`, error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// The functions below are old and will be removed.
// 🎯 NEW: 直接处理函数 - 绕过任务系统
// async function startDirectProcessing(...) { ... }
// async function startProcessingOrchestration(...) { ... }
// async function triggerFetchContentDirect(...) { ... }
// async function triggerFetchContentAsync(...) { ... }
// async function executeProcessingTask(...) { ... } 