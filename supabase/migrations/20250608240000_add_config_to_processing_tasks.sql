-- Add config column to processing_tasks table
-- This column will store task configuration like time_range
ALTER TABLE processing_tasks ADD COLUMN config JSONB DEFAULT '{}';

-- Add index for config column
CREATE INDEX idx_processing_tasks_config ON processing_tasks USING GIN (config); 