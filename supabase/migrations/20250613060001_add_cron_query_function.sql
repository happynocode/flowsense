-- Add function to query cron jobs safely
CREATE OR REPLACE FUNCTION get_cron_jobs()
RETURNS TABLE (
  jobname TEXT,
  schedule TEXT,
  command TEXT,
  active BOOLEAN,
  jobid BIGINT,
  username TEXT,
  database TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname,
    j.schedule,
    j.command,
    j.active,
    j.jobid,
    j.username,
    j.database
  FROM cron.job j
  ORDER BY j.jobname;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_cron_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cron_jobs() TO service_role; 