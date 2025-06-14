-- Restore pg_cron extension and permissions
-- This migration restores the cron functionality that was lost during database reset

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions to authenticated users for cron jobs
GRANT USAGE ON SCHEMA cron TO authenticated;
GRANT SELECT ON cron.job TO authenticated;

-- Grant permissions to service role for managing cron jobs
GRANT ALL ON SCHEMA cron TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO service_role;

-- Create a function to safely schedule cron jobs
CREATE OR REPLACE FUNCTION schedule_auto_digest_job(
  user_id_param UUID,
  cron_schedule TEXT,
  user_timezone TEXT DEFAULT 'UTC'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_name TEXT;
  job_id BIGINT;
BEGIN
  -- Create a unique job name
  job_name := 'auto_digest_' || user_id_param::TEXT;
  
  -- Remove existing job if it exists
  PERFORM cron.unschedule(job_name);
  
  -- Schedule the new job
  SELECT cron.schedule(
    job_name,
    cron_schedule,
    format('SELECT net.http_post(
      url := ''%s/functions/v1/execute-processing-task'',
      headers := jsonb_build_object(
        ''Content-Type'', ''application/json'',
        ''Authorization'', ''Bearer %s''
      ),
      body := jsonb_build_object(
        ''userId'', ''%s'',
        ''timeRange'', ''week'',
        ''userTimezone'', ''%s'',
        ''isAutoDigest'', true
      )
    );',
    current_setting('app.settings.supabase_url', true),
    current_setting('app.settings.supabase_service_role_key', true),
    user_id_param,
    user_timezone
    )
  ) INTO job_id;
  
  RETURN format('Scheduled job %s with ID %s', job_name, job_id);
END;
$$;

-- Create a function to unschedule auto digest jobs
CREATE OR REPLACE FUNCTION unschedule_auto_digest_job(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_name TEXT;
BEGIN
  job_name := 'auto_digest_' || user_id_param::TEXT;
  
  PERFORM cron.unschedule(job_name);
  
  RETURN format('Unscheduled job %s', job_name);
END;
$$;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION schedule_auto_digest_job(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unschedule_auto_digest_job(UUID) TO authenticated;

-- Note: RLS policies on cron.job table are managed by the system
-- Users can query cron jobs through the provided functions 