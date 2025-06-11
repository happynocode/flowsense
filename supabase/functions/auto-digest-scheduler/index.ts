/// <reference types="https://esm.sh/v135/@deno/shim-deno@0.19.0/dist/shim.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface User {
  id: string;
  email: string;
  auto_digest_enabled: boolean;
  auto_digest_time: string;
  auto_digest_timezone: string;
  last_auto_digest_run?: string;
}

serve(async (req) => {
  console.log('🎯🎯🎯 AUTO DIGEST SCHEDULER FUNCTION CALLED 🎯🎯🎯')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('🔧 Handling CORS request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Starting scheduler logic...')
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('🕐 Auto Digest Scheduler started')
    console.log('Supabase URL:', Deno.env.get('SUPABASE_URL'))

    // Get current UTC time
    const now = new Date()
    console.log(`🕐 Current UTC time: ${now.toISOString()}`)

    // Instead of matching by UTC time directly, we need to check each user's timezone
    // First, get all users who have auto digest enabled
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, email, auto_digest_enabled, auto_digest_time, auto_digest_timezone, last_auto_digest_run')
      .eq('auto_digest_enabled', true)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw usersError
    }

    console.log(`📊 Found ${users?.length || 0} users with auto digest enabled`)

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users have auto digest enabled',
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Filter users whose current local time matches their scheduled time
    const eligibleUsers = []
    const timeWindow = 5 // minutes tolerance

    for (const user of users) {
      try {
        const timezone = user.auto_digest_timezone || 'UTC'
        const scheduledTime = user.auto_digest_time // e.g., "09:00"
        
        // Get current time in user's timezone
        const nowInUserTimezone = new Date(now.toLocaleString("en-US", { timeZone: timezone }))
        const currentHour = nowInUserTimezone.getHours()
        const currentMinute = nowInUserTimezone.getMinutes()
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
        
        // Parse scheduled time
        const [scheduledHour, scheduledMinute] = scheduledTime.split(':').map(Number)
        
        // Calculate time difference in minutes
        const currentTotalMinutes = currentHour * 60 + currentMinute
        const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute
        const timeDifference = Math.abs(currentTotalMinutes - scheduledTotalMinutes)
        
        console.log(`👤 User ${user.email}: scheduled=${scheduledTime} (${timezone}), current=${currentTimeStr}, diff=${timeDifference}min`)
        
        // Check if current time is within the time window of scheduled time
        if (timeDifference <= timeWindow) {
          console.log(`✅ User ${user.email} is eligible for processing (within ${timeWindow}min window)`)
          eligibleUsers.push(user)
        } else {
          console.log(`⏭️ User ${user.email} not eligible (outside time window)`)
        }
        
      } catch (error) {
        console.error(`❌ Error processing timezone for user ${user.email}:`, error)
        // Skip users with timezone errors
        continue
      }
    }

    console.log(`🎯 Found ${eligibleUsers.length} eligible users for processing`)

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users scheduled for digest at this time',
          processed: 0,
          totalUsersChecked: users.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const results = []
    
    for (const user of eligibleUsers) {
      try {
        console.log(`🚀 Processing auto digest for user: ${user.email} (${user.id})`)
        
        // Check if we've already run today (to prevent multiple runs)
        const timezone = user.auto_digest_timezone || 'UTC';
        // 当前时间的用户时区日期
        const nowInUserTimezone = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
        const todayInUserTz = nowInUserTimezone.toISOString().split('T')[0];
        const lastRun = user.last_auto_digest_run;
        let lastRunDateInUserTz = null;
        if (lastRun) {
          const lastRunInUserTz = new Date(new Date(lastRun).toLocaleString("en-US", { timeZone: timezone }));
          lastRunDateInUserTz = lastRunInUserTz.toISOString().split('T')[0];
        }
        if (lastRunDateInUserTz === todayInUserTz) {
          console.log(`⏭️ Skipping user ${user.email} - already processed today (user timezone)`);
          results.push({
            userId: user.id,
            email: user.email,
            status: 'skipped',
            reason: 'Already processed today (user timezone)'
          });
          continue;
        }

        // 直接创建处理任务，不调用需要用户认证的start-processing函数
        console.log(`🔄 Creating processing task directly for user ${user.email}`)
        
        // Get sources count for progress tracking
        const { data: sources, error: sourcesError } = await supabaseClient
          .from('content_sources')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (sourcesError) {
          console.error(`❌ Failed to fetch sources for user ${user.email}:`, sourcesError)
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            error: `Failed to fetch sources: ${sourcesError.message}`
          })
          continue
        }

        const sourcesCount = sources?.length || 0
        console.log(`📊 User ${user.email} has ${sourcesCount} active sources`)

        // Create new processing task directly
        const { data: task, error: taskError } = await supabaseClient
          .from('processing_tasks')
          .insert({
            user_id: user.id,
            task_type: 'process_all_sources',
            status: 'pending',
            config: {
              time_range: 'today' // Auto digest uses 'today' by default
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
          console.error(`❌ Failed to create task for user ${user.email}:`, taskError)
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            error: `Failed to create task: ${taskError.message}`
          })
          continue
        }

        console.log(`✅ Created task ${task.id} for user ${user.email}`)

        // 立即调用 execute-processing-task 来处理刚创建的任务
        console.log(`🚀 Triggering execute-processing-task for task ID: ${task.id}`);
        const executionResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-processing-task`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: task.id })
        });

        // 我们在这里可以不等待 execute-processing-task 的完整结果，因为它可能是长时间运行的。
        // 我们只关心它是否被成功触发。
        if (!executionResponse.ok) {
          const errorBody = await executionResponse.text();
          console.error(`❌ Failed to trigger execute-processing-task for task ${task.id}. Status: ${executionResponse.status}, Body: ${errorBody}`);
          // 即使触发失败，我们仍然记录任务创建成功，但标记触发失败
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed_to_trigger',
            taskId: task.id,
            error: `Failed to trigger execution: ${errorBody}`
          });
          continue; // 继续处理下一个用户
        }

        const executionResult = await executionResponse.json();
        console.log(`✅ Successfully triggered execution for task ${task.id}. Response:`, executionResult);

        // Update user's last auto digest run timestamp
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ 
            last_auto_digest_run: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error(`❌ Failed to update last_auto_digest_run for user ${user.id}:`, updateError)
        } else {
          console.log(`✅ Updated last_auto_digest_run for user ${user.email}`)
        }

        results.push({
          userId: user.id,
          email: user.email,
          status: 'success',
          taskId: task.id,
          taskProcessorStatus: 'triggered'
        })

      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error)
        results.push({
          userId: user.id,
          email: user.email,
          status: 'error',
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const failedCount = results.filter(r => r.status === 'failed' || r.status === 'error').length
    const skippedCount = results.filter(r => r.status === 'skipped').length

    console.log(`📊 Auto digest scheduler completed: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${eligibleUsers.length} users`,
        stats: {
          total: eligibleUsers.length,
          success: successCount,
          failed: failedCount,
          skipped: skippedCount
        },
        results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Auto digest scheduler error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Auto digest scheduler failed'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 