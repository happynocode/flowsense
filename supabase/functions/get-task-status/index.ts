import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TaskStatusResponse {
  success: boolean;
  task?: any;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const task_id = url.searchParams.get('task_id')
    
    if (!task_id) {
      throw new Error('task_id parameter is required')
    }

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

    // Get task status (only user's own tasks)
    const { data: task, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .select('*')
      .eq('id', task_id)
      .eq('user_id', user.id)
      .single()

    if (taskError || !task) {
      throw new Error('Task not found or access denied')
    }

    const response: TaskStatusResponse = {
      success: true,
      task
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
    console.error('❌ Failed to get task status:', error)
    
    const errorResponse: TaskStatusResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: error instanceof Error && error.message.includes('not found') ? 404 : 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
}) 