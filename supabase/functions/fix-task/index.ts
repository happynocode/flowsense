import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { taskId } = await req.json()

    if (!taskId) {
      return new Response('Missing taskId', { status: 400 })
    }

    console.log(`🔧 Fixing task ${taskId}...`)

    // Update task status to completed
    const { error: updateError } = await supabaseClient
      .from('processing_tasks')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('status', 'running')

    if (updateError) {
      console.error(`❌ Failed to update task:`, updateError)
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Task ${taskId} status updated to completed`)

    // Get task details for digest generation
    const { data: task, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .select('user_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      console.log(`⚠️ Could not find task ${taskId} for digest generation`)
      return new Response(JSON.stringify({ success: true, message: 'Task fixed but digest generation skipped' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Trigger digest generation
    try {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-digest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          userId: task.user_id,
          timeRange: 'week'
        })
      })
      
      if (response.ok) {
        console.log(`✅ Successfully triggered digest generation for task ${taskId}`)
        return new Response(JSON.stringify({ success: true, message: 'Task fixed and digest generation triggered' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        console.error(`❌ Failed to trigger digest generation: ${response.status}`)
        return new Response(JSON.stringify({ success: true, message: 'Task fixed but digest generation failed' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    } catch (error) {
      console.error(`❌ Error triggering digest generation:`, error)
      return new Response(JSON.stringify({ success: true, message: 'Task fixed but digest generation error' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('❌ Fix task error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}) 