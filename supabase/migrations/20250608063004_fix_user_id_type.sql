/*
  # Simple Fix for User ID Type Issue
  
  Since Supabase Auth uses UUID for user IDs, we need to align our schema.
  This is a simplified approach that recreates the tables with correct types.
*/

-- Drop existing tables and recreate with proper UUID types
DROP TABLE IF EXISTS digest_items CASCADE;
DROP TABLE IF EXISTS summaries CASCADE; 
DROP TABLE IF EXISTS content_items CASCADE;
DROP TABLE IF EXISTS content_sources CASCADE;
DROP TABLE IF EXISTS digests CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with UUID primary key (matches Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_expiry TIMESTAMPTZ,
  stripe_customer_id TEXT,
  email_notifications BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Create content_sources table
CREATE TABLE content_sources (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT DEFAULT 'blog',
  description TEXT,
  has_rss BOOLEAN DEFAULT false,
  rss_url TEXT,
  scraping_selector TEXT,
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create content_items table
CREATE TABLE content_items (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_url TEXT UNIQUE NOT NULL,
  content_text TEXT,
  published_date TIMESTAMPTZ,
  audio_url TEXT,
  transcript TEXT,
  duration INTEGER,
  is_processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create summaries table
CREATE TABLE summaries (
  id SERIAL PRIMARY KEY,
  content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  summary_length INTEGER,
  reading_time INTEGER,
  model_used TEXT,
  processing_time FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create digests table
CREATE TABLE digests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  generation_date DATE NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  audio_url TEXT,
  audio_duration INTEGER,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create digest_items table
CREATE TABLE digest_items (
  id SERIAL PRIMARY KEY,
  digest_id INTEGER NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  summary_id INTEGER NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
  order_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own sources" ON content_sources
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sources" ON content_sources
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sources" ON content_sources
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sources" ON content_sources
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add policies for other tables
CREATE POLICY "Users can read own digests" ON digests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own digests" ON digests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own digests" ON digests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own digests" ON digests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_content_sources_user_id ON content_sources(user_id);
CREATE INDEX idx_content_items_source_id ON content_items(source_id);
CREATE INDEX idx_content_items_published_date ON content_items(published_date);
CREATE INDEX idx_summaries_content_item_id ON summaries(content_item_id);
CREATE INDEX idx_digests_user_id ON digests(user_id);
CREATE INDEX idx_digests_generation_date ON digests(generation_date);
CREATE INDEX idx_digest_items_digest_id ON digest_items(digest_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
