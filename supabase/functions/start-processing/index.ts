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
  taskId?: number;
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
      console.log('🧹 Force cleaning ALL pending/running tasks for this user...')
      
      // Force cleanup ALL pending and running tasks for this user (no time limit)
      const { error: forceCleanupError } = await supabaseClient
        .from('processing_tasks')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Task force-cleaned to allow new processing'
        })
        .eq('user_id', user.id)
        .in('status', ['pending', 'running'])
      
      if (forceCleanupError) {
        console.error('❌ Failed to force cleanup tasks:', forceCleanupError)
        throw new Error(`Failed to cleanup existing tasks: ${forceCleanupError.message}`)
      }
      
      console.log('✅ Force cleaned all conflicting tasks for user')
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
      taskId: task.id,
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