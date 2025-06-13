import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('⚙️ Starting completion check for source fetch jobs...')

    // 1. Get all tasks that are currently 'processing'
    const { data: pendingTasks, error: tasksError } = await supabaseClient
      .from('processing_tasks')
      .select('id, user_id, config')
      .eq('status', 'processing')

    if (tasksError) {
      console.error('❌ Error fetching pending tasks:', tasksError.message)
      throw tasksError
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending tasks to check.' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`🔍 Found ${pendingTasks.length} pending tasks.`)

    // For each pending task, check if all its fetch jobs are done (completed or failed)
    for (const task of pendingTasks) {
      const { data: jobStatus, error: jobError } = await supabaseClient
        .from('source_fetch_jobs')
        .select('status')
        .eq('task_id', task.id)

      if (jobError) {
        console.error(`Error fetching job statuses for task ${task.id}:`, jobError)
        continue // Skip to the next task
      }

      const totalJobs = jobStatus.length
      const finishedJobs = jobStatus.filter(s => s.status === 'completed' || s.status === 'failed').length

      console.log(`🔍 Task ${task.id}: ${finishedJobs} of ${totalJobs} jobs are finished.`)

      if (totalJobs > 0 && finishedJobs === totalJobs) {
        // All jobs for this task are done, trigger digest generation
        console.log(`✅ Task ${task.id} is complete. Invoking generate-digest...`)
        
        const { error: invokeError } = await supabaseClient.functions.invoke('generate-digest', {
          body: {
            userId: task.user_id,
            timeRange: task.config?.time_range || 'week',
            taskId: task.id,
          },
        })

        if (invokeError) {
          console.error(`❌ Failed to invoke generate-digest for task ${task.id}:`, invokeError)
          // Update task to 'failed' if invocation fails
          await supabaseClient
            .from('processing_tasks')
            .update({ status: 'failed', result: { error: `Digest generation trigger failed: ${invokeError.message}` } })
            .eq('id', task.id)
        } else {
          console.log(`✅ Successfully invoked generate-digest for task ${task.id}`)
          // Update task to 'generating_digest' to prevent re-triggering
           await supabaseClient
            .from('processing_tasks')
            .update({ status: 'generating_digest' })
            .eq('id', task.id)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: `Checked ${pendingTasks.length} tasks.` }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
