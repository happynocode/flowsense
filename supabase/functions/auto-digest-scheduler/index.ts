// Removed old std import - using Deno.serve instead
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Checks if the auto-digest has already run today for a user in their specific timezone.
 * @param lastRunISO The ISO 8601 string of the last run time.
 * @param timezone The user's timezone (e.g., 'America/New_York').
 * @param now The current Date object (UTC).
 * @returns True if a run has occurred today in the user's timezone, false otherwise.
 */
function hasRunToday(lastRunISO: string | null | undefined, timezone: string, now: Date): boolean {
  if (!lastRunISO) {
    return false; // Never run before
  }

  try {
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const todayInUserTz = dateFormatter.format(now);
    const lastRunDateInUserTz = dateFormatter.format(new Date(lastRunISO));

    console.log(`[Date Check] TZ: ${timezone}, Last Run (UTC): ${lastRunISO}, Last Run (User TZ): ${lastRunDateInUserTz}, Today (User TZ): ${todayInUserTz}`);

    return lastRunDateInUserTz === todayInUserTz;
  } catch (error) {
    console.error(`[Date Check] Error during timezone date comparison for timezone ${timezone}:`, error);
    // In case of error, default to allowing the run to avoid blocking a user indefinitely.
    return false;
  }
}

interface User {
  id: string;
  email: string;
  auto_digest_enabled: boolean;
  auto_digest_time: string;
  auto_digest_timezone: string;
  last_auto_digest_run?: string;
}

interface ProcessResult {
  userId: string;
  email: string;
  status: 'skipped' | 'failed' | 'success' | 'error';
  reason?: string;
  error?: string;
  taskId?: string;
  taskProcessorStatus?: string;
}

Deno.serve(async (req) => {
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
    const eligibleUsers: User[] = []
    const timeWindow = 5 // minutes tolerance

    for (const user of users) {
      try {
        const timezone = user.auto_digest_timezone || 'UTC'
        const scheduledTime = user.auto_digest_time // e.g., "09:00"
        
        // Get current time in user's timezone using Intl.DateTimeFormat for robustness
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        });
        const parts = timeFormatter.formatToParts(now);
        const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
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

    const results: ProcessResult[] = []
    
    for (const user of eligibleUsers) {
      try {
        console.log(`🚀 Processing auto digest for user: ${user.email} (${user.id})`)
        
        // Check if we've already run today using the dedicated helper function
        const timezone = user.auto_digest_timezone || 'UTC';
        if (hasRunToday(user.last_auto_digest_run, timezone, now)) {
          console.log(`⏭️ Skipping user ${user.email} - already processed today in their timezone.`);
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
        const { error: invokeError } = await supabaseClient.functions.invoke('execute-processing-task', {
          body: { taskId: task.id },
        })

        if (invokeError) {
          console.error(`❌ Failed to invoke execute-processing-task for task ${task.id}:`, invokeError)
          // 即使调用失败，也继续处理下一个用户，但记录错误
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            error: `Failed to trigger task execution: ${invokeError.message}`,
            taskId: task.id,
          })
          continue; // 继续下一个用户
        }

        console.log(`✅ Successfully invoked execute-processing-task for task ${task.id}`);

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