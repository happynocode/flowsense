import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PROCESSING_CONFIG = {
  TIMEOUT_MS: 30000, // 30 seconds for digest generation
}

function createTimeoutPromise<T>(ms: number, errorMessage: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms)
  })
}

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { userId, timeRange = 'week', taskId, partial = false } = await req.json()

    if (!userId || !taskId) {
      return new Response('Missing userId or taskId', { status: 400 })
    }

    console.log(`🚀 Starting digest generation for user: ${userId} (${timeRange}). Task ID: ${taskId}, Partial: ${partial}`)

    // Wrap the main processing in a timeout
    const result = await Promise.race([
      generateDigestFromSummaries(supabaseClient, userId, timeRange, taskId, partial),
      createTimeoutPromise(PROCESSING_CONFIG.TIMEOUT_MS, 'Digest generation timeout')
    ])

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Digest generation error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function generateDigestFromSummaries(
  supabaseClient: any, 
  userId: string, 
  timeRange: string = 'week',
  taskId: number,
  partial: boolean
): Promise<{ success: boolean; message: string; digestId?: number }> {
  
  let finalStatus = partial ? 'completed_with_errors' : 'completed';

  try {
    console.log(`📊 Generating digest for user ${userId} with timeRange: ${timeRange}`)

    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    console.log(`📅 Date range: ${startDate.toISOString()} to ${now.toISOString()}`)

    // Get user's sources
    const { data: userSources, error: sourcesError } = await supabaseClient
      .from('content_sources')
      .select('id, name, url, source_type')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (sourcesError) {
      console.error('❌ Failed to fetch user sources:', sourcesError)
      return { success: false, message: 'Failed to fetch user sources' }
    }

    if (!userSources || userSources.length === 0) {
      console.log('⚠️ No sources found for user')
      return { success: false, message: 'No sources configured for user' }
    }

    const sourceIds = userSources.map(us => us.id)
    console.log(`📋 Found ${sourceIds.length} sources for user`)

    // Base query for summaries
    let summaryQuery = supabaseClient
      .from('summaries')
      .select(`
        id,
        summary_text,
        content_item:content_items!inner (
          id,
          title,
          content_url,
          published_date,
          source_id,
          fetch_job_id
        )
      `)
      .in('content_item.source_id', sourceIds)
      .gte('content_item.published_date', startDate.toISOString())
      .lte('content_item.published_date', now.toISOString())

    // If it's a partial digest, only fetch content from successful jobs for this task
    if (partial) {
      const { data: successfulJobs, error: jobsError } = await supabaseClient
        .from('source_fetch_jobs')
        .select('id')
        .eq('task_id', taskId)
        .eq('status', 'completed')

      if (jobsError) {
        throw new Error(`Failed to fetch successful jobs for partial digest: ${jobsError.message}`)
      }
      
      const successfulJobIds = successfulJobs.map(j => j.id)
      summaryQuery = summaryQuery.in('content_item.fetch_job_id', successfulJobIds)
    }

    // Execute the query
    const { data: summaries, error: summariesError } = await summaryQuery.order('created_at', { ascending: false })

    if (summariesError) {
      console.error('❌ Failed to fetch summaries:', summariesError)
      finalStatus = 'failed';
      return { success: false, message: 'Failed to fetch summaries' }
    }

    if (!summaries || summaries.length === 0) {
      console.log('⚠️ No summaries found for the specified time range')
      
      // If no content, we still mark the task as complete.
      await supabaseClient.from('processing_tasks').update({ 
        status: finalStatus,
        result: { message: 'No content found for the specified time range.' },
        updated_at: new Date().toISOString()
      }).eq('id', taskId)

      return { success: false, message: 'No content found for the specified time range' }
    }

    console.log(`📰 Found ${summaries.length} summaries to include in digest`)

    // Generate unique identifier for this digest to prevent concurrent duplicates
    const digestTitle = `${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}ly Digest - ${now.toLocaleDateString()}`
    const generationDate = now.toISOString().split('T')[0] // Use date for deduplication
    
    // Generate the digest content using AI first (before any DB operations)
    const digestContent = await generateDigestContent(summaries, timeRange, userSources)

    // Use upsert to handle concurrency - this will either insert or update existing
    const { data: upsertedDigest, error: upsertError } = await supabaseClient
      .from('digests')
      .upsert({
        user_id: userId,
        title: digestTitle,
        content: digestContent,
        generation_date: generationDate,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id,generation_date,title', // Corrected to match the current unique constraint
        ignoreDuplicates: false // Always update with latest content
      })
      .select('id')
      .single()

    if (upsertError || !upsertedDigest) {
      console.error('❌ Failed to upsert digest:', upsertError)
      return { success: false, message: 'Failed to create/update digest' }
    }

    console.log(`✅ Successfully upserted digest with ID: ${upsertedDigest.id}`)

    // Clear existing digest_items for this digest to refresh the list
    const { error: deleteItemsError } = await supabaseClient
      .from('digest_items')
      .delete()
      .eq('digest_id', upsertedDigest.id)

    if (deleteItemsError) {
      console.log('⚠️ Warning: Failed to clear existing digest items:', deleteItemsError)
    }

    // Create fresh digest_items to link summaries to the digest
    const digestItems = summaries.map((summary, index) => ({
      digest_id: upsertedDigest.id,
      summary_id: summary.id,
      order_position: index + 1
    }))

    const { error: itemsError } = await supabaseClient
      .from('digest_items')
      .insert(digestItems)

    if (itemsError) {
      console.error('❌ Failed to create digest items:', itemsError)
      console.log('⚠️ Digest created but items failed to link')
    } else {
      console.log(`✅ Successfully linked ${digestItems.length} items to digest`)
    }
    
    // Finally, update the parent processing_task to 'completed'
    await supabaseClient.from('processing_tasks').update({ 
      status: finalStatus, 
      result: { 
        digestId: upsertedDigest.id, 
        message: `Digest generated with ${summaries.length} summaries.`
      },
      updated_at: new Date().toISOString()
    }).eq('id', taskId)
    
    return { 
      success: true, 
      message: `Digest generated with ${summaries.length} summaries`, 
      digestId: upsertedDigest.id 
    }

  } catch (error) {
    console.error('❌ Digest generation error:', error)
    
    // On any failure, mark the parent task as failed
    await supabaseClient.from('processing_tasks').update({
      status: 'failed',
      result: { error: `Digest generation failed: ${error.message}` },
      updated_at: new Date().toISOString()
    }).eq('id', taskId)

    return { success: false, message: error.message }
  }
}

async function generateDigestContent(summaries: any[], timeRange: string, userSources: any[]): Promise<string> {
  try {
    console.log(`🤖 Generating digest content from ${summaries.length} summaries`)

    // Create a map for quick source lookup
    const sourceMap = new Map(userSources.map(s => [s.id, s.name]));

    // Group summaries by source
    const sourceGroups: { [key: string]: any[] } = {}
    
    for (const summary of summaries) {
      const sourceId = summary.content_item?.source_id;
      const sourceName = sourceMap.get(sourceId) || 'Unknown Source';
      if (!sourceGroups[sourceName]) {
        sourceGroups[sourceName] = []
      }
      sourceGroups[sourceName].push(summary)
    }

    // Build digest content
    let digestContent = `# ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}ly Digest\n\n`
    digestContent += `*Generated on ${new Date().toLocaleDateString()}*\n\n`
    digestContent += `This digest includes ${summaries.length} articles from ${Object.keys(sourceGroups).length} sources.\n\n---\n\n`

    // Add content by source
    for (const [sourceName, sourceSummaries] of Object.entries(sourceGroups)) {
      digestContent += `## ${sourceName}\n\n`
      
      for (const summary of sourceSummaries) {
        const title = summary.content_item?.title || 'Untitled'
        const url = summary.content_item?.content_url || '#'
        const summaryText = summary.summary_text || 'No summary available'
        
        digestContent += `### [${title}](${url})\n`
        digestContent += `${summaryText}\n\n`
      }
      digestContent += '---\n\n'
    }

    // Add footer
    digestContent += `\n*This digest was automatically generated from your subscribed sources.*`

    return digestContent

  } catch (error) {
    console.error('❌ Failed to generate digest content:', error)
    throw error
  }
} 