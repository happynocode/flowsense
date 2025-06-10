/*
  # Add Subscription Limits and Permissions
  
  Adds subscription-related fields to users table to control access to features.
*/

-- Add subscription limit fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS max_sources INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS can_schedule_digest BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_process_weekly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- Add index for subscription tier queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

-- Add missing Stripe fields to subscriptions table if they don't exist
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_webhook_endpoint_secret TEXT,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;

-- Update existing free users to have proper limits
UPDATE users 
SET max_sources = 3, 
    can_schedule_digest = false, 
    can_process_weekly = false,
    subscription_tier = 'free'
WHERE subscription_tier IS NULL OR subscription_tier = '';

-- Update users with active subscriptions to have premium limits
UPDATE users 
SET max_sources = 20, 
    can_schedule_digest = true, 
    can_process_weekly = true,
    subscription_tier = 'premium'
WHERE id IN (
  SELECT user_id 
  FROM subscriptions 
  WHERE status = 'active'
);

-- Create function to update user limits when subscription changes
CREATE OR REPLACE FUNCTION update_user_subscription_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- If subscription becomes active, grant premium permissions
  IF NEW.status = 'active' THEN
    UPDATE users 
    SET max_sources = 20,
        can_schedule_digest = true,
        can_process_weekly = true,
        subscription_tier = 'premium'
    WHERE id = NEW.user_id;
    
  -- If subscription becomes inactive, revert to free limits
  ELSIF NEW.status IN ('canceled', 'past_due', 'unpaid') THEN
    UPDATE users 
    SET max_sources = 3,
        can_schedule_digest = false,
        can_process_weekly = false,
        subscription_tier = 'free'
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user limits when subscription status changes
DROP TRIGGER IF EXISTS subscription_status_changed ON subscriptions;
CREATE TRIGGER subscription_status_changed
  AFTER UPDATE OF status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscription_limits(); 