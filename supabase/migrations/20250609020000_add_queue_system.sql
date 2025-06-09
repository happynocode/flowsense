-- Add queue system for asynchronous article processing
-- This migration adds tables and functions to support background processing queues

-- Create job queue table
CREATE TABLE IF NOT EXISTS job_queue (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL CHECK (job_type IN ('content_fetch', 'ai_summary', 'digest_build')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 5, -- 1=highest, 10=lowest
  payload JSONB NOT NULL,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id),
  task_id BIGINT REFERENCES processing_tasks(id)
);

-- Create indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_job_queue_status_priority 
ON job_queue(status, priority, created_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_job_queue_type_status 
ON job_queue(job_type, status);

CREATE INDEX IF NOT EXISTS idx_job_queue_task_id 
ON job_queue(task_id);

-- Create content fetch queue table for batching
CREATE TABLE IF NOT EXISTS content_fetch_queue (
  id BIGSERIAL PRIMARY KEY,
  article_url TEXT NOT NULL,
  source_id BIGINT REFERENCES content_sources(id),
  article_title TEXT NOT NULL,
  article_description TEXT,
  published_date TIMESTAMPTZ,
  fetch_status TEXT NOT NULL DEFAULT 'pending' CHECK (fetch_status IN ('pending', 'fetching', 'completed', 'failed')),
  content_text TEXT,
  fetch_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetched_at TIMESTAMPTZ,
  task_id BIGINT REFERENCES processing_tasks(id),
  job_id BIGINT REFERENCES job_queue(id)
);

-- Create indexes for content fetch queue
CREATE INDEX IF NOT EXISTS idx_content_fetch_queue_status 
ON content_fetch_queue(fetch_status, created_at);

CREATE INDEX IF NOT EXISTS idx_content_fetch_queue_task_id 
ON content_fetch_queue(task_id);

-- Add queue processing configuration
CREATE TABLE IF NOT EXISTS queue_config (
  id SERIAL PRIMARY KEY,
  queue_type TEXT NOT NULL UNIQUE,
  batch_size INTEGER NOT NULL DEFAULT 5,
  timeout_seconds INTEGER NOT NULL DEFAULT 120,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default queue configurations
INSERT INTO queue_config (queue_type, batch_size, timeout_seconds) VALUES
('content_fetch', 10, 120),
('ai_summary', 5, 180),
('digest_build', 1, 300)
ON CONFLICT (queue_type) DO NOTHING;

-- Create function to get next job from queue
CREATE OR REPLACE FUNCTION get_next_queue_job(
  p_job_type TEXT,
  p_limit INTEGER DEFAULT 1
) RETURNS SETOF job_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE job_queue 
  SET 
    status = 'processing',
    started_at = NOW()
  WHERE id IN (
    SELECT id 
    FROM job_queue 
    WHERE job_type = p_job_type 
      AND status = 'pending'
      AND retry_count < max_retries
    ORDER BY priority ASC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark job as completed
CREATE OR REPLACE FUNCTION complete_queue_job(
  p_job_id BIGINT,
  p_result JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE job_queue 
  SET 
    status = 'completed',
    completed_at = NOW(),
    result = p_result
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark job as failed
CREATE OR REPLACE FUNCTION fail_queue_job(
  p_job_id BIGINT,
  p_error_message TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE job_queue 
  SET 
    status = CASE 
      WHEN retry_count + 1 >= max_retries THEN 'failed'
      ELSE 'pending'
    END,
    completed_at = CASE 
      WHEN retry_count + 1 >= max_retries THEN NOW()
      ELSE NULL
    END,
    retry_count = retry_count + 1,
    error_message = p_error_message,
    started_at = NULL
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add queue processing stats view
CREATE OR REPLACE VIEW queue_stats AS
SELECT 
  job_type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM job_queue 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY job_type, status;

-- Add RLS policies for job queue
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs" ON job_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all jobs" ON job_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Add RLS policies for content fetch queue  
ALTER TABLE content_fetch_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their content fetch jobs" ON content_fetch_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM processing_tasks pt 
      WHERE pt.id = content_fetch_queue.task_id 
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all content fetch jobs" ON content_fetch_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE job_queue IS 'Main queue table for asynchronous job processing';
COMMENT ON TABLE content_fetch_queue IS 'Specialized queue for batching article content fetching';
COMMENT ON TABLE queue_config IS 'Configuration settings for different queue types';
COMMENT ON FUNCTION get_next_queue_job IS 'Atomically gets and locks the next job(s) from queue';
COMMENT ON FUNCTION complete_queue_job IS 'Marks a job as successfully completed';
COMMENT ON FUNCTION fail_queue_job IS 'Marks a job as failed and handles retry logic'; 