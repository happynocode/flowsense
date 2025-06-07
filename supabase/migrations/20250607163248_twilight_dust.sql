/*
  # Initial Schema for Daily Content Digest

  1. New Tables
    - `users`
      - `id` (integer, primary key)
      - `email` (text, unique)
      - `google_id` (text, unique, nullable)
      - `name` (text)
      - `avatar_url` (text, nullable)
      - `subscription_status` (text, default 'inactive')
      - `subscription_expiry` (timestamp, nullable)
      - `stripe_customer_id` (text, nullable)
      - `email_notifications` (boolean, default true)
      - `digest_frequency` (text, default 'daily')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_login` (timestamp, nullable)

    - `content_sources`
      - `id` (integer, primary key)
      - `user_id` (integer, foreign key)
      - `name` (text)
      - `url` (text)
      - `source_type` (text)
      - `description` (text, nullable)
      - `has_rss` (boolean, default false)
      - `rss_url` (text, nullable)
      - `scraping_selector` (text, nullable)
      - `is_active` (boolean, default true)
      - `last_scraped_at` (timestamp, nullable)
      - `last_error` (text, nullable)
      - `error_count` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `content_items`
      - `id` (integer, primary key)
      - `source_id` (integer, foreign key)
      - `title` (text)
      - `content_url` (text, unique)
      - `content_text` (text, nullable)
      - `published_date` (timestamp, nullable)
      - `audio_url` (text, nullable)
      - `transcript` (text, nullable)
      - `duration` (integer, nullable)
      - `is_processed` (boolean, default false)
      - `processing_error` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `summaries`
      - `id` (integer, primary key)
      - `content_item_id` (integer, foreign key)
      - `summary_text` (text)
      - `summary_length` (integer, nullable)
      - `reading_time` (integer, nullable)
      - `model_used` (text, nullable)
      - `processing_time` (float, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `digests`
      - `id` (integer, primary key)
      - `user_id` (integer, foreign key)
      - `title` (text)
      - `generation_date` (date)
      - `email_sent` (boolean, default false)
      - `email_sent_at` (timestamp, nullable)
      - `audio_url` (text, nullable)
      - `audio_duration` (integer, nullable)
      - `is_read` (boolean, default false)
      - `read_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `digest_items`
      - `id` (integer, primary key)
      - `digest_id` (integer, foreign key)
      - `summary_id` (integer, foreign key)
      - `order_position` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `subscriptions`
      - `id` (integer, primary key)
      - `user_id` (integer, foreign key)
      - `stripe_customer_id` (text, nullable)
      - `stripe_subscription_id` (text, nullable, unique)
      - `stripe_price_id` (text, nullable)
      - `plan_type` (text)
      - `status` (text)
      - `current_period_start` (timestamp, nullable)
      - `current_period_end` (timestamp, nullable)
      - `cancel_at_period_end` (boolean, default false)
      - `canceled_at` (timestamp, nullable)
      - `amount` (integer)
      - `currency` (text, default 'usd')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
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
CREATE TABLE IF NOT EXISTS content_sources (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Create content_items table
CREATE TABLE IF NOT EXISTS content_items (
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
CREATE TABLE IF NOT EXISTS summaries (
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
CREATE TABLE IF NOT EXISTS digests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS digest_items (
  id SERIAL PRIMARY KEY,
  digest_id INTEGER NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  summary_id INTEGER NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
  order_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_user_id ON content_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_content_items_source_id ON content_items(source_id);
CREATE INDEX IF NOT EXISTS idx_content_items_published_date ON content_items(published_date);
CREATE INDEX IF NOT EXISTS idx_summaries_content_item_id ON summaries(content_item_id);
CREATE INDEX IF NOT EXISTS idx_digests_user_id ON digests(user_id);
CREATE INDEX IF NOT EXISTS idx_digests_generation_date ON digests(generation_date);
CREATE INDEX IF NOT EXISTS idx_digest_items_digest_id ON digest_items(digest_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

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
  USING (auth.uid()::text = google_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = google_id);

-- Create RLS policies for content_sources table
CREATE POLICY "Users can manage own content sources" ON content_sources
  FOR ALL TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth.uid()::text = google_id));

-- Create RLS policies for content_items table
CREATE POLICY "Users can read content from own sources" ON content_items
  FOR SELECT TO authenticated
  USING (source_id IN (
    SELECT cs.id FROM content_sources cs 
    JOIN users u ON cs.user_id = u.id 
    WHERE auth.uid()::text = u.google_id
  ));

-- Create RLS policies for summaries table
CREATE POLICY "Users can read summaries from own content" ON summaries
  FOR SELECT TO authenticated
  USING (content_item_id IN (
    SELECT ci.id FROM content_items ci
    JOIN content_sources cs ON ci.source_id = cs.id
    JOIN users u ON cs.user_id = u.id
    WHERE auth.uid()::text = u.google_id
  ));

-- Create RLS policies for digests table
CREATE POLICY "Users can manage own digests" ON digests
  FOR ALL TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth.uid()::text = google_id));

-- Create RLS policies for digest_items table
CREATE POLICY "Users can read own digest items" ON digest_items
  FOR SELECT TO authenticated
  USING (digest_id IN (
    SELECT d.id FROM digests d
    JOIN users u ON d.user_id = u.id
    WHERE auth.uid()::text = u.google_id
  ));

-- Create RLS policies for subscriptions table
CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth.uid()::text = google_id));