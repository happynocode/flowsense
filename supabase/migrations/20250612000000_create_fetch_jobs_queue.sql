-- Create the new table for source fetch jobs
CREATE TABLE source_fetch_jobs (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT REFERENCES processing_tasks(id) ON DELETE CASCADE,
    source_id BIGINT REFERENCES content_sources(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    time_range TEXT,
    attempts INT NOT NULL DEFAULT 0,
    last_attempted_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_source_fetch_jobs_status_attempts ON source_fetch_jobs(status, attempts);
CREATE INDEX idx_source_fetch_jobs_task_id ON source_fetch_jobs(task_id);

-- Enable RLS
ALTER TABLE source_fetch_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Allow users to see their own fetch jobs"
ON source_fetch_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow service_role to do everything"
ON source_fetch_jobs FOR ALL
USING (true)
WITH CHECK (true);


-- Create a function to get and lock a batch of pending fetch jobs (CORRECTED VERSION)
CREATE OR REPLACE FUNCTION get_and_lock_pending_fetch_jobs(p_limit INT)
RETURNS TABLE (
    job_id BIGINT,
    source_id BIGINT,
    task_id BIGINT,
    time_range TEXT,
    source_url TEXT,
    source_name TEXT
) AS $$
DECLARE
    locked_job_ids BIGINT[];
BEGIN
    -- Step 1: Select and lock the job IDs, storing them in an array
    SELECT ARRAY_AGG(sfj.id)
    INTO locked_job_ids
    FROM (
        SELECT id
        FROM source_fetch_jobs
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    ) AS sfj;

    -- If no jobs are found, exit early
    IF array_length(locked_job_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    -- Step 2: Update the status of the locked jobs
    UPDATE source_fetch_jobs
    SET
        status = 'processing',
        attempts = attempts + 1,
        last_attempted_at = NOW()
    WHERE id = ANY(locked_job_ids);

    -- Step 3: Return the updated job details by joining with content_sources
    RETURN QUERY
    SELECT
        sfj.id,
        sfj.source_id,
        sfj.task_id,
        sfj.time_range,
        cs.url,
        cs.name
    FROM source_fetch_jobs AS sfj
    JOIN content_sources AS cs ON sfj.source_id = cs.id
    WHERE sfj.id = ANY(locked_job_ids);
END;
$$ LANGUAGE plpgsql; 