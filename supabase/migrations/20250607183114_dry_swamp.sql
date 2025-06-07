/*
  # Fix Foreign Key Type Mismatches

  1. Problem
    - Some tables use SERIAL (integer) primary keys
    - Others use UUID primary keys
    - Foreign key constraints fail due to type mismatches

  2. Solution
    - Ensure consistent data types across all foreign key relationships
    - Keep user-related tables using UUID (matching auth.uid())
    - Keep content-related tables using SERIAL for performance
*/

-- Drop existing tables if they exist to recreate with correct types
DROP TABLE IF EXISTS digest_items CASCADE;
DROP TABLE IF EXISTS digests CASCADE;
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS content_items CASCADE;
DROP TABLE IF EXISTS content_sources CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table with UUID primary key
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

-- Create content_sources table (SERIAL id, UUID user_id)
CREATE TABLE content_sources (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL,
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

-- Create content_items table (SERIAL id, INTEGER source_id)
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

-- Create summaries table (SERIAL id, INTEGER content_item_id)
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

-- Create digests table (SERIAL id, UUID user_id)
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

-- Create digest_items table (SERIAL id, INTEGER digest_id, INTEGER summary_id)
CREATE TABLE digest_items (
  id SERIAL PRIMARY KEY,
  digest_id INTEGER NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  summary_id INTEGER NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
  order_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscriptions table (SERIAL id, UUID user_id)
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

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_content_sources_user_id ON content_sources(user_id);
CREATE INDEX idx_content_items_source_id ON content_items(source_id);
CREATE INDEX idx_content_items_published_date ON content_items(published_date);
CREATE INDEX idx_summaries_content_item_id ON summaries(content_item_id);
CREATE INDEX idx_digests_user_id ON digests(user_id);
CREATE INDEX idx_digests_generation_date ON digests(generation_date);
CREATE INDEX idx_digest_items_digest_id ON digest_items(digest_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create RLS policies for content_sources table
CREATE POLICY "Users can manage own content sources" ON content_sources
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for content_items table
CREATE POLICY "Users can read content from own sources" ON content_items
  FOR SELECT TO authenticated
  USING (source_id IN (
    SELECT id FROM content_sources WHERE user_id = auth.uid()
  ));

-- Create RLS policies for summaries table
CREATE POLICY "Users can read summaries from own content" ON summaries
  FOR SELECT TO authenticated
  USING (content_item_id IN (
    SELECT ci.id FROM content_items ci
    JOIN content_sources cs ON ci.source_id = cs.id
    WHERE cs.user_id = auth.uid()
  ));

-- Create RLS policies for digests table
CREATE POLICY "Users can manage own digests" ON digests
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for digest_items table
CREATE POLICY "Users can read own digest items" ON digest_items
  FOR SELECT TO authenticated
  USING (digest_id IN (
    SELECT id FROM digests WHERE user_id = auth.uid()
  ));

-- Create RLS policies for subscriptions table
CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Create a function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user record when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();