import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Configuration for batch processing
const PROCESSING_CONFIG = {
  TIMEOUT_MS: 10000, // 10 seconds - just for orchestration
}

// Helper function to create timeout promise
function createTimeoutPromise<T>(ms: number, errorMessage: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
}

// CORS headers helper
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

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders,
      })
    }

    const body = await req.json()
    const taskId = body.taskId || body.task_id  // 支持两种参数名
    const directMode = body.directMode || false
    const userId = body.user_id
    const timeRange = body.timeRange

    // 检查是否为直接模式
    if (directMode) {
      if (!userId || !timeRange) {
        return new Response(JSON.stringify({ error: 'Missing user_id or timeRange for direct mode' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }

      console.log(`🎯 Starting direct processing for user: ${userId}, timeRange: ${timeRange}`)

      // 直接处理模式，绕过任务系统
      const result = await Promise.race([
        startDirectProcessing(supabaseClient, userId, timeRange),
        createTimeoutPromise(PROCESSING_CONFIG.TIMEOUT_MS, 'Direct processing startup timeout')
      ])

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 原有的任务模式
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Missing taskId or task_id' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    console.log(`🚀 Starting processing orchestration for task: ${taskId}`)

    // Wrap the orchestration in a timeout (short timeout since we're not waiting for completion)
    const result = await Promise.race([
      startProcessingOrchestration(supabaseClient, taskId),
      createTimeoutPromise(PROCESSING_CONFIG.TIMEOUT_MS, 'Orchestration startup timeout')
    ])

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('❌ Processing orchestration error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})

// 🎯 NEW: 直接处理函数 - 绕过任务系统
async function startDirectProcessing(
  supabaseClient: any,
  userId: string,
  timeRange: string
): Promise<{ success: boolean; message: string; results: any }> {
  
  try {
    console.log(`🎯 Starting direct processing for user: ${userId}, timeRange: ${timeRange}`)

    // Get user sources directly
    const { data: userSources, error: sourcesError } = await supabaseClient
      .from('content_sources')
      .select('id, name, url, source_type')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (sourcesError) {
      console.error('❌ Failed to fetch user sources:', sourcesError)
      return { success: false, message: 'Failed to fetch user sources', results: null }
    }

    console.log(`📊 Direct processing for user ${userId} with ${userSources?.length || 0} sources`)

    const sourcesCount = userSources?.length || 0

    // Start processing each source (fire and forget)
    if (userSources && userSources.length > 0) {
      console.log(`🎯 Starting direct processing for ${sourcesCount} sources...`)
      
      for (const source of userSources) {
        if (!source) continue

        // Fire and forget - don't await, 直接模式不需要taskId
        triggerFetchContentDirect(
          source.id,
          source.url,
          source.name,
          timeRange,
          userId
        ).catch(error => {
          console.error(`❌ Failed to trigger direct processing for source ${source.name}:`, error)
        })
      }
    }

    console.log(`✅ Direct processing started for user ${userId}`)

    return {
      success: true,
      message: `Direct processing started for ${sourcesCount} sources. Processing will continue in background.`,
      results: {
        userId,
        timeRange,
        totalSources: sourcesCount,
        status: 'direct_processing_started'
      }
    }

  } catch (error) {
    console.error('❌ Direct processing error:', error)
    return { success: false, message: error.message, results: null }
  }
}

async function startProcessingOrchestration(
  supabaseClient: any,
  taskId: number
): Promise<{ success: boolean; message: string; results: any }> {
  
  try {
    console.log(`📋 Starting orchestration for task: ${taskId}`)

    // Get task details
    const { data: task, error: taskError } = await supabaseClient
      .from('processing_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      console.error('❌ Failed to fetch task:', taskError)
      return { success: false, message: 'Task not found', results: null }
    }

    // Get user sources separately  
    const { data: userSources, error: sourcesError } = await supabaseClient
      .from('content_sources')
      .select('id, name, url, source_type')
      .eq('user_id', task.user_id)
      .eq('is_active', true)

    if (sourcesError) {
      console.error('❌ Failed to fetch user sources:', sourcesError)
      return { success: false, message: 'Failed to fetch user sources', results: null }
    }

    // Update task status to running
    await supabaseClient
      .from('processing_tasks')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', taskId)

    console.log(`📊 Task: ${task.task_type} for user ${task.user_id} with ${userSources?.length || 0} sources`)

    const sourcesCount = userSources?.length || 0

    // Start processing each source (fire and forget)
    if (userSources && userSources.length > 0) {
      console.log(`🚀 Starting async processing for ${sourcesCount} sources...`)
      
      for (const source of userSources) {
        if (!source) continue

        // Fire and forget - don't await
        triggerFetchContentAsync(
          source.id,
          source.url,
          source.name,
          task.config?.time_range || 'week',
          taskId
        ).catch(error => {
          console.error(`❌ Failed to trigger processing for source ${source.name}:`, error)
        })
      }
    }

    console.log(`✅ Processing orchestration started for task ${taskId}`)

    return {
      success: true,
      message: `Processing started for ${sourcesCount} sources. Processing will continue in background.`,
      results: {
        taskId,
        totalSources: sourcesCount,
        status: 'processing_started'
      }
    }

  } catch (error) {
    console.error('❌ Processing orchestration error:', error)
    
    // Update task status to failed
    try {
      await supabaseClient
        .from('processing_tasks')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: `Orchestration failed: ${error.message}`
        })
        .eq('id', taskId)
    } catch (updateError) {
      console.error('❌ Failed to update task status:', updateError)
    }
    
    return { success: false, message: error.message, results: null }
  }
}

// 🎯 NEW: 直接模式的内容处理触发器
async function triggerFetchContentDirect(
  sourceId: number,
  sourceUrl: string,
  sourceName: string,
  timeRange: string,
  userId: string
): Promise<void> {
  
  try {
    console.log(`🎯 Triggering direct processing for source: ${sourceName}`)
    
    // Call fetch-content in fire-and-forget mode for direct processing
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceId,
        sourceUrl,
        sourceName,
        timeRange,
        userId,
        directMode: true  // 标记为直接模式
      })
    }).then(async (response) => {
      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Direct processing started for ${sourceName}: ${result.message}`)
      } else {
        console.error(`❌ Failed to start direct processing for ${sourceName}: ${response.status}`)
      }
    }).catch(error => {
      console.error(`❌ Network error calling fetch-content for ${sourceName}:`, error)
    })

  } catch (error) {
    console.error(`❌ Failed to trigger fetch-content for ${sourceName}:`, error)
    throw error
  }
}

async function triggerFetchContentAsync(
  sourceId: number,
  sourceUrl: string,
  sourceName: string,
  timeRange: string,
  taskId: number
): Promise<void> {
  
  try {
    console.log(`🔄 Triggering async processing for source: ${sourceName}`)
    
    // Call fetch-content in fire-and-forget mode
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceId,
        sourceUrl,
        sourceName,
        timeRange,
        taskId
      })
    }).then(async (response) => {
      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Async processing started for ${sourceName}: ${result.message}`)
      } else {
        console.error(`❌ Failed to start processing for ${sourceName}: ${response.status}`)
      }
    }).catch(error => {
      console.error(`❌ Network error calling fetch-content for ${sourceName}:`, error)
    })

  } catch (error) {
    console.error(`❌ Failed to trigger fetch-content for ${sourceName}:`, error)
    throw error
  }
} 