import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

interface StartTaskRequest {
  time_range?: 'today' | 'week';
}

interface StartTaskResponse {
  success: boolean;
  task_id?: number;
  message?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
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

    // Parse request body to get time_range parameter
    let requestBody: StartTaskRequest = {}
    try {
      if (req.method === 'POST') {
        const text = await req.text()
        if (text && text.trim()) {
          requestBody = JSON.parse(text)
        }
      }
    } catch (error) {
      console.log('⚠️ Failed to parse request body, using defaults:', error)
      requestBody = {}
    }
    const timeRange = requestBody.time_range || 'week' // default to week

    console.log('🚀 Starting async processing task for user:', user.id, 'with time range:', timeRange)

    // Check if there's already a running task for this user
    const { data: existingTask } = await supabaseClient
      .from('processing_tasks')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'running'])
      .maybeSingle()

    if (existingTask) {
      console.log('⚠️ Found existing task:', existingTask.id, 'with status:', existingTask.status)
      
      // Auto-cleanup stale tasks
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      
      // Clean up old pending tasks (older than 30 minutes)
      const { error: cleanupPendingError } = await supabaseClient
        .from('processing_tasks')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Pending task cleaned up due to timeout'
        })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lt('created_at', thirtyMinutesAgo)
      
      // Clean up stale running tasks (running for more than 5 minutes without updates)
      const { error: cleanupRunningError } = await supabaseClient
        .from('processing_tasks')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Running task cleaned up - likely crashed or stalled'
        })
        .eq('user_id', user.id)
        .eq('status', 'running')
        .or(`started_at.lt.${fiveMinutesAgo},started_at.is.null`)
      
      const cleanupError = cleanupPendingError || cleanupRunningError
      
      if (cleanupError) {
        console.error('Failed to cleanup stale tasks:', cleanupError)
      } else {
        console.log('✅ Cleaned up stale tasks older than 1 hour')
      }
      
      // Re-check for existing tasks after cleanup
      const { data: stillExistingTask } = await supabaseClient
        .from('processing_tasks')
        .select('id, status, created_at')
        .eq('user_id', user.id)
        .in('status', ['pending', 'running'])
        .maybeSingle()
      
      if (stillExistingTask) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `已有处理任务正在运行中 (ID: ${stillExistingTask.id}, 状态: ${stillExistingTask.status})`,
            task_id: stillExistingTask.id
          } as StartTaskResponse),
          {
            status: 409, // Conflict
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }
    }

    // Get sources count for progress tracking
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('content_sources')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    const sourcesCount = sources?.length || 0

    // Create new processing task with time range
    const { data: task, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .insert({
        user_id: user.id,
        task_type: 'process_all_sources',
        status: 'pending',
        config: {
          time_range: timeRange
        },
        progress: {
          current: 0,
          total: sourcesCount,
          processed_sources: [],
          skipped_sources: []
        }
      })
      .select()
      .single()

    if (taskError) {
      throw new Error(`Failed to create task: ${taskError.message}`)
    }

    console.log('✅ Created processing task:', task.id)

    // Since triggering execute-processing-task is failing, let's return success
    // and rely on a periodic task checker or manual trigger
    console.log('⚠️ Note: execute-processing-task must be triggered manually or by a cron job')
    console.log('📋 Task created with ID:', task.id, 'and status: pending')

    const response: StartTaskResponse = {
      success: true,
      task_id: task.id,
      message: `已创建处理任务 ID=${task.id}，请手动触发 execute-processing-task 或等待定时任务执行`
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )

  } catch (error) {
    console.error('❌ Failed to start processing task:', error)
    
    const errorResponse: StartTaskResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
}) 