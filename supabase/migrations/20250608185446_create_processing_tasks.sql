-- Create processing_tasks table for async task management
CREATE TABLE processing_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL DEFAULT 'process_all_sources',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  progress JSONB DEFAULT '{}', -- {"current": 1, "total": 5, "processed_sources": [...]}
  result JSONB DEFAULT '{}', -- Final result when completed
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_processing_tasks_user_id ON processing_tasks(user_id);
CREATE INDEX idx_processing_tasks_status ON processing_tasks(status);
CREATE INDEX idx_processing_tasks_created_at ON processing_tasks(created_at);

-- Enable RLS
ALTER TABLE processing_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tasks"
  ON processing_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON processing_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update tasks"
  ON processing_tasks FOR UPDATE
  USING (true); -- Allow system updates (Edge Functions)

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_processing_tasks_updated_at
  BEFORE UPDATE ON processing_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
