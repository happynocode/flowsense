import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Task processor started - checking for pending tasks...')

    // 查找所有pending状态的任务
    const { data: pendingTasks, error: tasksError } = await supabaseClient
      .from('processing_tasks')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // 限制一次处理的任务数

    if (tasksError) {
      console.error('❌ Failed to fetch pending tasks:', tasksError)
      throw tasksError
    }

    console.log(`📋 Found ${pendingTasks?.length || 0} pending tasks`)

    if (!pendingTasks || pendingTasks.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending tasks to process',
        processed_tasks: 0
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const processedTasks = []

    // 处理每个pending任务
    for (const task of pendingTasks) {
      console.log(`🚀 Triggering processing for task ${task.id}: ${task.task_type}`)

      // Fire-and-forget the processing task
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-processing-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: task.id
        })
      }).catch(error => {
        // Log errors but don't let them block the processor
        console.error(`❌ Background trigger for task ${task.id} failed:`, error.message)
      })

      processedTasks.push({
        taskId: task.id,
        status: 'triggered'
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedTasks.length} tasks`,
      processed_tasks: processedTasks.length,
      tasks: processedTasks
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('❌ Task processor error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}) 