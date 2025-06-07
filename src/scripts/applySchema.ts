import { supabase } from '../lib/supabase';

const migrationSQL = `
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can manage own content sources" ON content_sources;
DROP POLICY IF EXISTS "Users can read content from own sources" ON content_items;
DROP POLICY IF EXISTS "Users can read summaries from own content" ON summaries;
DROP POLICY IF EXISTS "Users can manage own digests" ON digests;
DROP POLICY IF EXISTS "Users can read own digest items" ON digest_items;
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON subscriptions;

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
`;

export async function applyDatabaseSchema() {
  try {
    console.log('Applying database schema...');
    
    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Error applying schema:', error);
      throw error;
    }
    
    console.log('Database schema applied successfully!');
    return { success: true };
  } catch (error) {
    console.error('Failed to apply database schema:', error);
    throw error;
  }
}

// Auto-run the schema application when this module is imported
if (typeof window !== 'undefined') {
  applyDatabaseSchema().catch(console.error);
}