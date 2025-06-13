import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // 验证环境变量
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing required environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        message: 'Missing required environment variables'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    console.log('⚙️ Starting completion check for source fetch jobs...');

    // 1. 获取所有处于'processing'状态的任务
    const { data: pendingTasks, error: tasksError } = await supabaseClient
      .from('processing_tasks')
      .select('id, user_id, config')
      .eq('status', 'processing');

    if (tasksError) {
      console.error('❌ Error fetching pending tasks:', tasksError.message);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch pending tasks',
        message: tasksError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('✅ No pending tasks to check');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No pending tasks to check' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔍 Found ${pendingTasks.length} pending tasks to check`);

    let processedCount = 0;
    let errorCount = 0;

    // 检查每个待处理任务
    for (const task of pendingTasks) {
      try {
        console.log(`🔍 Checking task ${task.id}...`);
        
        const { data: jobStatus, error: jobError } = await supabaseClient
          .from('source_fetch_jobs')
          .select('status')
          .eq('task_id', task.id);

        if (jobError) {
          console.error(`❌ Error fetching job statuses for task ${task.id}:`, jobError.message);
          errorCount++;
          continue;
        }

        const totalJobs = jobStatus.length;
        const finishedJobs = jobStatus.filter(s => s.status === 'completed' || s.status === 'failed').length;
        const failedJobs = jobStatus.filter(s => s.status === 'failed').length;

        console.log(`📊 Task ${task.id}: ${finishedJobs}/${totalJobs} jobs finished, ${failedJobs} failed`);

        // 如果所有作业都已完成（成功或失败）
        if (totalJobs > 0 && finishedJobs === totalJobs) {
          const isPartial = failedJobs > 0;
          
          console.log(`✅ Task ${task.id} is complete (partial: ${isPartial}). Triggering digest generation...`);
          
          try {
            // 获取用户的时区设置
            const { data: userSettings } = await supabaseClient
              .from('user_settings')
              .select('auto_digest_timezone')
              .eq('user_id', task.user_id)
              .single();
            
            const userTimezone = userSettings?.auto_digest_timezone || 'UTC';
            
            const { data: invokeData, error: invokeError } = await supabaseClient.functions.invoke('generate-digest', {
              body: {
                userId: task.user_id,
                timeRange: task.config?.time_range || 'week',
                taskId: task.id,
                partial: isPartial,
                userTimezone: userTimezone,
              },
            });

            if (invokeError) {
              console.error(`❌ Failed to invoke generate-digest for task ${task.id}:`, invokeError);
              
              // 更新任务状态为失败，包含详细错误信息
              const { error: updateError } = await supabaseClient
                .from('processing_tasks')
                .update({ 
                  status: 'failed', 
                  result: { 
                    error: `Digest generation failed: ${invokeError.message}`,
                    context: invokeError.context || 'No additional context'
                  } 
                })
                .eq('id', task.id);
                
              if (updateError) {
                console.error(`❌ Failed to update task ${task.id} status to failed:`, updateError.message);
              } else {
                console.log(`✅ Task ${task.id} status updated to failed`);
              }
              
              errorCount++;
            } else {
              console.log(`✅ Successfully triggered digest generation for task ${task.id}`);
              console.log(`📄 Invoke response:`, JSON.stringify(invokeData));
              processedCount++;
            }
            
          } catch (invokeException) {
            console.error(`❌ Exception during generate-digest invocation for task ${task.id}:`, invokeException);
            
            // 处理调用异常
            try {
              const { error: updateError } = await supabaseClient
                .from('processing_tasks')
                .update({ 
                  status: 'failed', 
                  result: { 
                    error: `Digest generation exception: ${invokeException.message}`,
                    type: 'invocation_exception'
                  } 
                })
                .eq('id', task.id);
                
              if (updateError) {
                console.error(`❌ Failed to update task ${task.id} after exception:`, updateError.message);
              }
            } catch (updateException) {
              console.error(`❌ Exception while updating task ${task.id} after invoke exception:`, updateException);
            }
            
            errorCount++;
          }
          
        } else {
          console.log(`⏳ Task ${task.id} still has ${totalJobs - finishedJobs} pending jobs`);
        }
        
      } catch (taskError) {
        console.error(`❌ Error processing task ${task.id}:`, taskError);
        errorCount++;
      }
    }

    const summary = {
      success: true,
      totalTasks: pendingTasks.length,
      processedTasks: processedCount,
      errors: errorCount,
      message: `Checked ${pendingTasks.length} tasks: ${processedCount} processed, ${errorCount} errors`
    };

    console.log(`📋 Completion check summary:`, summary);

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Critical error in check-task-completion:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
})
