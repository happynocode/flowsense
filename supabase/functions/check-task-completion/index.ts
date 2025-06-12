import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Helper function to check if a task is complete ---
async function isTaskComplete(supabaseClient: SupabaseClient, taskId: number) {
  const { count: totalItemsCount, error: totalError } = await supabaseClient
    .from('content_items')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId);

  if (totalError) {
    console.error(`❌ Error counting total items for task ${taskId}:`, totalError);
    return false;
  }

  // A task with no items is not "complete" in a sense that it should trigger a digest.
  if (totalItemsCount === 0) {
    return false;
  }

  const { count: processedItemsCount, error: processedError } = await supabaseClient
    .from('content_items')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId)
    .eq('is_processed', true);

  if (processedError) {
    console.error(`❌ Error counting processed items for task ${taskId}:`, processedError);
    return false;
  }
  
  console.log(`📊 Task ${taskId} Progress: ${processedItemsCount} / ${totalItemsCount} items processed.`);
  
  return totalItemsCount === processedItemsCount;
}

// --- Helper function to trigger digest generation ---
async function triggerDigestGeneration(supabaseClient: SupabaseClient, taskId: number) {
  const { data: taskData, error: taskError } = await supabaseClient
    .from('processing_tasks')
    .select('user_id, config')
    .eq('id', taskId)
    .single();

  if (taskError || !taskData) {
    console.error(`❌ Could not retrieve task details for task ${taskId}. Cannot trigger digest.`, taskError);
    return;
  }

  const timeRange = taskData.config?.time_range || 'week';
  const userId = taskData.user_id;

  console.log(`🎯 Task ${taskId} complete! Triggering digest generation for user ${userId} with timeRange: ${timeRange}`);

  try {
    const { error } = await supabaseClient.functions.invoke('generate-digest', {
      body: {
        userId: userId,
        timeRange: timeRange
      },
    });

    if (error) throw error;
    
    console.log(`✅ Successfully triggered digest generation for task ${taskId}.`);
    await supabaseClient
        .from('processing_tasks')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', taskId);

  } catch (invokeError) {
    console.error(`❌ Failed to trigger digest generation for task ${taskId}:`, invokeError);
    await supabaseClient
        .from('processing_tasks')
        .update({ status: 'failed', result: { error: `Digest generation trigger failed: ${invokeError.message}` } })
        .eq('id', taskId);
  }
}

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('⚙️ Starting task completion check...')

    // 1. Get all tasks that are currently being processed.
    const { data: processingTasks, error: tasksError } = await supabaseClient
      .from('processing_tasks')
      .select('id')
      .eq('status', 'processing');

    if (tasksError) {
      console.error('❌ Failed to fetch processing tasks:', tasksError);
      throw tasksError;
    }

    if (!processingTasks || processingTasks.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No tasks in "processing" state to check.' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Found ${processingTasks.length} tasks to check for completion.`);
    
    // 2. For each task, check if it's complete and trigger digest if so.
    for (const task of processingTasks) {
      const isComplete = await isTaskComplete(supabaseClient, task.id);
      if (isComplete) {
        await triggerDigestGeneration(supabaseClient, task.id);
      } else {
        console.log(`⏳ Task ${task.id} is not yet complete. Will check again on next run.`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Checked ${processingTasks.length} tasks.`
    }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Task completion checker error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}) 