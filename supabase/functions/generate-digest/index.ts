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

    const { userId, timeRange = 'week', taskId, partial = false, userTimezone = 'UTC' } = await req.json()

    if (!userId || !taskId) {
      return new Response('Missing userId or taskId', { status: 400 })
    }

    console.log(`🚀 Starting digest generation for user: ${userId} (${timeRange}). Task ID: ${taskId}, Partial: ${partial}, Timezone: ${userTimezone}`)

    // Wrap the main processing in a timeout
    const result = await Promise.race([
      generateDigestFromSummaries(supabaseClient, userId, timeRange, taskId, partial, userTimezone),
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
  partial: boolean,
  userTimezone: string = 'UTC'
): Promise<{ success: boolean; message: string; digestId?: number }> {
  
  let finalStatus = partial ? 'completed_with_errors' : 'completed';

  try {
    console.log(`📊 Generating digest for user ${userId} with timeRange: ${timeRange}`)

    // Calculate date range - MUST match fetch-content logic exactly
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case 'today':
      case 'day': // Treat legacy 'day' as 'today' - match fetch-content logic
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day - exact match
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days - exact match
        break
      default:
        console.warn(`Unknown timeRange "${timeRange}", defaulting to 'week'`)
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // default to 7 days - exact match
    }

    console.log(`📅 Date range: ${startDate.toISOString()} to ${now.toISOString()}`)
    console.log(`📅 Human readable: ${startDate.toLocaleString()} to ${now.toLocaleString()}`)

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
    console.log(`📋 Found ${sourceIds.length} sources for user:`, sourceIds)
    console.log(`📋 Source details:`, userSources.map(s => ({ id: s.id, name: s.name })))

    // Base query for summaries with flexible time filtering
    // Get all summaries for user sources, filter by published_date on client side
    let summaryQuery = supabaseClient
      .from('summaries')
      .select(`
        id,
        summary_text,
        created_at,
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

    // If it's a partial digest, only fetch content from successful jobs for this task
    if (partial) {
      // For partial digest, we still want to include all available summaries
      // The "partial" flag mainly affects task status reporting, not content filtering
      console.log(`🔄 Partial mode: Including all available summaries, not just current task`)
    }

    // Execute the query - Note: Supabase doesn't allow ordering by nested field directly in join queries
    // We'll order by the summary's created_at field instead, which is accessible
    console.log(`🔍 Executing summary query with conditions:`)
    console.log(`   - Source IDs: [${sourceIds.join(', ')}]`)
    console.log(`   - Date range: ${startDate.toISOString()} to ${now.toISOString()}`)
    console.log(`   - Partial mode: ${partial}`)
    
    const { data: summaries, error: summariesError } = await summaryQuery.order('created_at', { ascending: false })

    if (summariesError) {
      console.error('❌ Failed to fetch summaries:', summariesError)
      finalStatus = 'failed';
      return { success: false, message: 'Failed to fetch summaries' }
    }

    console.log(`🔍 Query result: Found ${summaries?.length || 0} summaries`)
    
    // Filter summaries based on content_item published_date or summary created_at
    let filteredSummaries = summaries
    if (summaries && summaries.length > 0) {
      filteredSummaries = summaries.filter(summary => {
        const publishedDate = summary.content_item?.published_date ? new Date(summary.content_item.published_date) : null
        // Only filter by published_date: from now backwards based on timeRange
        const publishedInRange = publishedDate && publishedDate >= startDate && publishedDate <= now
        
        return publishedInRange
      })
      console.log(`🔍 After time filtering: ${filteredSummaries.length} summaries remain`)
    }
    
    if (filteredSummaries && filteredSummaries.length > 0) {
      console.log(`📊 Summary details:`)
      filteredSummaries.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i+1}. ${s.content_item?.title} (${s.content_item?.published_date})`)
      })
      if (filteredSummaries.length > 3) {
        console.log(`   ... and ${filteredSummaries.length - 3} more`)
      }
    }

    if (!filteredSummaries || filteredSummaries.length === 0) {
      console.log('⚠️ No summaries found for the specified time range')
      console.log('❌ Marking task as failed due to no summaries found')
      
      // Update processing task status to failed
      if (taskId) {
        await supabaseClient
          .from('processing_tasks')
          .update({ 
            status: 'failed',
            result: { message: 'No summaries found for the specified time range' },
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId)
      }
      
      return { success: false, message: 'No summaries found for the specified time range' }
    }

    console.log(`📰 Found ${filteredSummaries.length} summaries to include in digest`)

    // Generate unique identifier for this digest to prevent concurrent duplicates
    // Use user's timezone for display date
    const userDate = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    }).format(now);
    
    const digestTitle = `${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}ly Digest - ${userDate}`
    const generationDate = now.toISOString().split('T')[0] // Use UTC date for deduplication
    
    // Generate the digest content using AI first (before any DB operations)
    const digestContent = await generateDigestContent(filteredSummaries, timeRange, userSources)

    // Insert new digest record (no longer using upsert since unique constraints were removed)
    const { data: insertedDigest, error: insertError } = await supabaseClient
      .from('digests')
      .insert({
        user_id: userId,
        title: digestTitle,
        content: digestContent,
        generation_date: generationDate,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .select('id')
      .single()

    if (insertError || !insertedDigest) {
      console.error('❌ Failed to insert digest:', insertError)
      return { success: false, message: 'Failed to create digest' }
    }

    console.log(`✅ Successfully inserted digest with ID: ${insertedDigest.id}`)

    // Clear existing digest_items for this digest to refresh the list
    const { error: deleteItemsError } = await supabaseClient
      .from('digest_items')
      .delete()
      .eq('digest_id', insertedDigest.id)

    if (deleteItemsError) {
      console.log('⚠️ Warning: Failed to clear existing digest items:', deleteItemsError)
    }

    // Create fresh digest_items to link summaries to the digest
    const digestItems = filteredSummaries.map((summary, index) => ({
      digest_id: insertedDigest.id,
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
        digestId: insertedDigest.id, 
        message: `Digest generated with ${filteredSummaries.length} summaries.`
      },
      updated_at: new Date().toISOString()
    }).eq('id', taskId)
    
    return { 
      success: true, 
      message: `Digest generated with ${filteredSummaries.length} summaries`, 
      digestId: insertedDigest.id 
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