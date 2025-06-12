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

    const { userId, timeRange = 'week' } = await req.json()

    if (!userId) {
      return new Response('Missing userId', { status: 400 })
    }

    console.log(`🚀 Starting digest generation for user: ${userId} (${timeRange})`)

    // Wrap the main processing in a timeout
    const result = await Promise.race([
      generateDigestFromSummaries(supabaseClient, userId, timeRange),
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
  timeRange: string = 'week'
): Promise<{ success: boolean; message: string; digestId?: number }> {
  
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

    // Get summaries from the specified time range
    const { data: summaries, error: summariesError } = await supabaseClient
      .from('summaries')
      .select(`
        id,
        summary_text,
        content_item:content_items!inner (
          id,
          title,
          content_url,
          published_date,
          source_id
        )
      `)
      .in('content_item.source_id', sourceIds)
      .gte('content_item.published_date', startDate.toISOString())
      .lte('content_item.published_date', now.toISOString())
      .order('created_at', { ascending: false })

    if (summariesError) {
      console.error('❌ Failed to fetch summaries:', summariesError)
      return { success: false, message: 'Failed to fetch summaries' }
    }

    if (!summaries || summaries.length === 0) {
      console.log('⚠️ No summaries found for the specified time range')
      return { success: false, message: 'No content found for the specified time range' }
    }

    console.log(`📰 Found ${summaries.length} summaries to include in digest`)

    // Generate unique identifier for this digest to prevent concurrent duplicates
    const digestTitle = `${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}ly Digest - ${now.toLocaleDateString()}`
    const generationDate = now.toISOString().split('T')[0] // Use date for deduplication
    
    // Generate the digest content using AI first (before any DB operations)
    const digestContent = await generateDigestContent(summaries, timeRange, userSources)

    // ALWAYS INSERT a new digest record. The unique constraint has been removed.
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

    // Link summaries to the newly created digest
    const digestItems = summaries.map((summary, index) => ({
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
    
    return { 
      success: true, 
      message: `Digest generated with ${summaries.length} summaries`, 
      digestId: insertedDigest.id 
    }

  } catch (error) {
    console.error('❌ Digest generation error:', error)
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