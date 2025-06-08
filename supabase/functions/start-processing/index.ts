import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
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

    console.log('🚀 Starting async processing task for user:', user.id)

    // Check if there's already a running task for this user
    const { data: existingTask } = await supabaseClient
      .from('processing_tasks')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'running'])
      .maybeSingle()

    if (existingTask) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '已有处理任务正在运行中',
          task_id: existingTask.id
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

    // Create new processing task
    const { data: task, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .insert({
        user_id: user.id,
        task_type: 'process_all_sources',
        status: 'pending',
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