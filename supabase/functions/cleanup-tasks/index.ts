import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    console.log('🧹 开始清理卡住的任务...')

    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()

    // 查询所有pending和running状态的任务（强制清理，不管时间）
    const { data: tasksToClean, error: fetchError } = await supabaseClient
      .from('processing_tasks')
      .select('id, status, created_at, started_at, user_id')
      .or('status.eq.pending,status.eq.running')

    if (fetchError) {
      throw new Error(`查询任务失败: ${fetchError.message}`)
    }

    console.log(`找到 ${tasksToClean?.length || 0} 个pending/running任务需要强制清理`)

    if (!tasksToClean || tasksToClean.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '没有找到pending/running状态的任务',
          cleaned_count: 0
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      )
    }

    // 清理这些任务
    const taskIds = tasksToClean.map(task => task.id)
    const { data: cleanedTasks, error: cleanError } = await supabaseClient
      .from('processing_tasks')
      .update({
        status: 'failed',
        completed_at: now.toISOString(),
        error_message: '任务超时或卡住，已自动清理'
      })
      .in('id', taskIds)
      .select()

    if (cleanError) {
      throw new Error(`清理任务失败: ${cleanError.message}`)
    }

    console.log(`✅ 成功清理 ${cleanedTasks?.length || 0} 个任务`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `成功清理 ${cleanedTasks?.length || 0} 个卡住的任务`,
        cleaned_count: cleanedTasks?.length || 0,
        cleaned_tasks: cleanedTasks?.map(t => ({ id: t.id, status: t.status }))
      }),
      { 
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ 清理任务时出错:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500
      }
    )
  }
}) 