-- Ensure auto digest columns exist in users table
-- This is a safety migration to fix any missing columns after database operations

-- Add auto digest columns if they don't exist
DO $$ 
BEGIN
  -- Check and add auto_digest_enabled column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'auto_digest_enabled') THEN
    ALTER TABLE users ADD COLUMN auto_digest_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Check and add auto_digest_time column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'auto_digest_time') THEN
    ALTER TABLE users ADD COLUMN auto_digest_time TIME DEFAULT '09:00:00';
  END IF;

  -- Check and add auto_digest_timezone column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'auto_digest_timezone') THEN
    ALTER TABLE users ADD COLUMN auto_digest_timezone TEXT DEFAULT 'UTC';
  END IF;

  -- Check and add last_auto_digest_run column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'last_auto_digest_run') THEN
    ALTER TABLE users ADD COLUMN last_auto_digest_run TIMESTAMPTZ;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_auto_digest_enabled 
ON users(auto_digest_enabled) WHERE auto_digest_enabled = true;

CREATE INDEX IF NOT EXISTS idx_users_auto_digest_time 
ON users(auto_digest_time) WHERE auto_digest_enabled = true; 