-- Add comprehensive task completion status evaluation function
-- This migration adds a function to properly evaluate task completion
-- considering both fetch jobs and content processing status
-- Also adds explicit phase tracking to processing_tasks table

-- Add phase tracking columns to processing_tasks table
ALTER TABLE processing_tasks 
ADD COLUMN IF NOT EXISTS fetch_phase_status VARCHAR(20) DEFAULT 'pending' CHECK (fetch_phase_status IN ('pending', 'in_progress', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_phase_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_phase_status IN ('pending', 'in_progress', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS fetch_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;

-- Create function to get comprehensive task completion status
CREATE OR REPLACE FUNCTION get_task_completion_status(p_task_id BIGINT)
RETURNS TABLE (
    task_id BIGINT,
    fetch_jobs_total INTEGER,
    fetch_jobs_completed INTEGER,
    fetch_jobs_failed INTEGER,
    content_items_total INTEGER,
    content_items_processed INTEGER,
    content_items_failed INTEGER,
    is_fetch_complete BOOLEAN,
    is_processing_complete BOOLEAN,
    overall_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH fetch_stats AS (
        SELECT 
            COUNT(*) as total_fetch_jobs,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_fetch_jobs,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_fetch_jobs
        FROM source_fetch_jobs 
        WHERE source_fetch_jobs.task_id = p_task_id
    ),
    content_stats AS (
        SELECT 
            COUNT(*) as total_content_items,
            COUNT(*) FILTER (WHERE is_processed = true AND processing_error IS NULL) as processed_content_items,
            COUNT(*) FILTER (WHERE is_processed = true AND processing_error IS NOT NULL) as failed_content_items
        FROM content_items 
        WHERE content_items.task_id = p_task_id
    )
    SELECT 
        p_task_id,
        COALESCE(fs.total_fetch_jobs, 0)::INTEGER,
        COALESCE(fs.completed_fetch_jobs, 0)::INTEGER,
        COALESCE(fs.failed_fetch_jobs, 0)::INTEGER,
        COALESCE(cs.total_content_items, 0)::INTEGER,
        COALESCE(cs.processed_content_items, 0)::INTEGER,
        COALESCE(cs.failed_content_items, 0)::INTEGER,
        -- Fetch is complete when all fetch jobs are done (completed or failed)
        CASE 
            WHEN COALESCE(fs.total_fetch_jobs, 0) = 0 THEN false
            ELSE (COALESCE(fs.completed_fetch_jobs, 0) + COALESCE(fs.failed_fetch_jobs, 0)) = COALESCE(fs.total_fetch_jobs, 0)
        END as is_fetch_complete,
        -- Processing is complete when all content items are processed
        CASE 
            WHEN COALESCE(cs.total_content_items, 0) = 0 THEN true  -- No content to process
            ELSE (COALESCE(cs.processed_content_items, 0) + COALESCE(cs.failed_content_items, 0)) = COALESCE(cs.total_content_items, 0)
        END as is_processing_complete,
        -- Overall status logic
        CASE 
            WHEN COALESCE(fs.total_fetch_jobs, 0) = 0 THEN 'no_fetch_jobs'
            WHEN (COALESCE(fs.completed_fetch_jobs, 0) + COALESCE(fs.failed_fetch_jobs, 0)) < COALESCE(fs.total_fetch_jobs, 0) THEN 'fetching'
            WHEN COALESCE(cs.total_content_items, 0) = 0 THEN 'fetch_complete_no_content'
            WHEN (COALESCE(cs.processed_content_items, 0) + COALESCE(cs.failed_content_items, 0)) < COALESCE(cs.total_content_items, 0) THEN 'processing'
            ELSE 'complete'
        END as overall_status
    FROM fetch_stats fs, content_stats cs;
END;
$$ LANGUAGE plpgsql;

-- Add indexes to optimize the completion status queries
CREATE INDEX IF NOT EXISTS idx_source_fetch_jobs_task_id_status 
ON source_fetch_jobs(task_id, status);

CREATE INDEX IF NOT EXISTS idx_content_items_task_id_processed 
ON content_items(task_id, is_processed);

-- Add function to update task phase status
CREATE OR REPLACE FUNCTION update_task_phase_status(
    p_task_id BIGINT,
    p_phase VARCHAR(20), -- 'fetch' or 'processing'
    p_status VARCHAR(20) -- 'pending', 'in_progress', 'completed', 'failed'
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_phase = 'fetch' THEN
        UPDATE processing_tasks 
        SET fetch_phase_status = p_status,
            fetch_completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE fetch_completed_at END,
            updated_at = NOW()
        WHERE id = p_task_id;
    ELSIF p_phase = 'processing' THEN
        UPDATE processing_tasks 
        SET processing_phase_status = p_status,
            processing_completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE processing_completed_at END,
            updated_at = NOW()
        WHERE id = p_task_id;
    ELSE
        RETURN FALSE;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for phase status queries
CREATE INDEX IF NOT EXISTS idx_processing_tasks_fetch_phase 
ON processing_tasks(fetch_phase_status);

CREATE INDEX IF NOT EXISTS idx_processing_tasks_processing_phase 
ON processing_tasks(processing_phase_status);

-- Add comments for documentation
COMMENT ON FUNCTION get_task_completion_status IS 
'Comprehensive function to evaluate task completion status considering both fetch jobs and content processing phases';

COMMENT ON FUNCTION update_task_phase_status IS 
'Helper function to update task phase status with proper timestamps and validation';

COMMENT ON COLUMN processing_tasks.fetch_phase_status IS 
'Tracks the status of the fetch phase: pending -> in_progress -> completed/failed';

COMMENT ON COLUMN processing_tasks.processing_phase_status IS 
'Tracks the status of the content processing phase: pending -> in_progress -> completed/failed'; 