import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/cors.ts'

const BATCH_SIZE = 30; // Process 30 jobs at a time

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get a batch of pending jobs to process
    console.log(`🔎 Fetching up to ${BATCH_SIZE} pending fetch jobs...`);
    const { data: jobs, error: rpcError } = await supabaseClient
      .rpc('get_and_lock_pending_fetch_jobs', { p_limit: BATCH_SIZE });

    if (rpcError) {
      console.error('❌ Error fetching pending fetch jobs:', rpcError);
      throw new Error(`Failed to get pending jobs: ${rpcError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('✅ No pending fetch jobs to process.');
      return new Response(JSON.stringify({ message: 'No pending fetch jobs to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🚀 Triggering fetch-content for ${jobs.length} jobs...`);

    // Fire-and-forget invocations for fetch-content for each job
    for (const job of jobs) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fetchJobId: job.job_id, // Pass the job ID
          sourceId: job.source_id,
          sourceUrl: job.source_url,
          sourceName: job.source_name,
          timeRange: job.time_range,
          taskId: job.task_id
        }),
      }).catch(e => console.error(`❌ Error triggering fetch-content for job ${job.job_id}:`, e.message));
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully triggered fetch jobs for ${jobs.length} sources.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`❌ Unhandled error in process-fetch-queue:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 