/*
  # Add Scheduled Digest Feature
  
  This migration adds fields to support scheduled daily digest processing.
*/

-- Add scheduled digest configuration columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auto_digest_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_digest_time TIME DEFAULT '09:00:00', 
ADD COLUMN IF NOT EXISTS auto_digest_timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS last_auto_digest_run TIMESTAMPTZ;

-- Create index for efficient querying of users who have auto digest enabled
CREATE INDEX IF NOT EXISTS idx_users_auto_digest_enabled 
ON users(auto_digest_enabled) WHERE auto_digest_enabled = true;

-- Create index for auto digest time to help with scheduling queries
CREATE INDEX IF NOT EXISTS idx_users_auto_digest_time 
ON users(auto_digest_time) WHERE auto_digest_enabled = true; 