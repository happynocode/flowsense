-- Add batch processing support to processing_tasks table
-- This migration adds fields to support multi-batch processing

-- Update the config column to support batch information
COMMENT ON COLUMN processing_tasks.config IS 'Processing configuration including time_range, current_batch, max_sources, max_articles_per_source';

-- Update the progress column to support batch progress tracking  
COMMENT ON COLUMN processing_tasks.progress IS 'Processing progress including current_batch, total_batches, batch_current, batch_total, global_current, global_total';

-- Add index for faster task lookup by status and batch processing
CREATE INDEX IF NOT EXISTS idx_processing_tasks_status_batch 
ON processing_tasks(status, (config->>'current_batch'));

-- Add index for faster lookup of recent tasks
CREATE INDEX IF NOT EXISTS idx_processing_tasks_created_at 
ON processing_tasks(created_at DESC); 