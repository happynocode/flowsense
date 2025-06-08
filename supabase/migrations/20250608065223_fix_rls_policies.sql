/*
  # Fix RLS Policies
  
  Fix RLS policies to ensure proper authentication and access control.
  The issue is that users can't access their own content_sources data.
*/

-- Drop and recreate RLS policies for content_sources
DROP POLICY IF EXISTS "Users can read own sources" ON content_sources;
DROP POLICY IF EXISTS "Users can insert own sources" ON content_sources;
DROP POLICY IF EXISTS "Users can update own sources" ON content_sources;
DROP POLICY IF EXISTS "Users can delete own sources" ON content_sources;

-- Create more permissive policies for content_sources
CREATE POLICY "Enable read access for authenticated users" ON content_sources
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Enable insert for authenticated users" ON content_sources
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable update for authenticated users" ON content_sources
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable delete for authenticated users" ON content_sources
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Also ensure users table has proper policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Service role can insert users" ON users;

-- Recreate user policies
CREATE POLICY "Enable read access for users" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Enable update for users" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow service role to insert users (for triggers)
CREATE POLICY "Service role can insert users" ON users
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Add policies for content_items (users should access via content_sources)
DROP POLICY IF EXISTS "Users can read content items" ON content_items;
CREATE POLICY "Users can read content items" ON content_items
  FOR SELECT TO authenticated
  USING (
    source_id IN (
      SELECT id FROM content_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert content items" ON content_items
  FOR INSERT TO authenticated
  WITH CHECK (
    source_id IN (
      SELECT id FROM content_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update content items" ON content_items
  FOR UPDATE TO authenticated
  USING (
    source_id IN (
      SELECT id FROM content_sources WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete content items" ON content_items
  FOR DELETE TO authenticated
  USING (
    source_id IN (
      SELECT id FROM content_sources WHERE user_id = auth.uid()
    )
  );

-- Add policies for summaries (users should access via content_items)
DROP POLICY IF EXISTS "Users can read summaries" ON summaries;
CREATE POLICY "Users can read summaries" ON summaries
  FOR SELECT TO authenticated
  USING (
    content_item_id IN (
      SELECT ci.id FROM content_items ci
      JOIN content_sources cs ON ci.source_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert summaries" ON summaries
  FOR INSERT TO authenticated
  WITH CHECK (
    content_item_id IN (
      SELECT ci.id FROM content_items ci
      JOIN content_sources cs ON ci.source_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update summaries" ON summaries
  FOR UPDATE TO authenticated
  USING (
    content_item_id IN (
      SELECT ci.id FROM content_items ci
      JOIN content_sources cs ON ci.source_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete summaries" ON summaries
  FOR DELETE TO authenticated
  USING (
    content_item_id IN (
      SELECT ci.id FROM content_items ci
      JOIN content_sources cs ON ci.source_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

-- Add policies for digest_items
DROP POLICY IF EXISTS "Users can read digest items" ON digest_items;
CREATE POLICY "Users can read digest items" ON digest_items
  FOR SELECT TO authenticated
  USING (
    digest_id IN (
      SELECT id FROM digests WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert digest items" ON digest_items
  FOR INSERT TO authenticated
  WITH CHECK (
    digest_id IN (
      SELECT id FROM digests WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update digest items" ON digest_items
  FOR UPDATE TO authenticated
  USING (
    digest_id IN (
      SELECT id FROM digests WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete digest items" ON digest_items
  FOR DELETE TO authenticated
  USING (
    digest_id IN (
      SELECT id FROM digests WHERE user_id = auth.uid()
    )
  );

-- Add policies for subscriptions
DROP POLICY IF EXISTS "Users can read subscriptions" ON subscriptions;
CREATE POLICY "Users can read subscriptions" ON subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert subscriptions" ON subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update subscriptions" ON subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete subscriptions" ON subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
