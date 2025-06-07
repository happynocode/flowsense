/*
  # Add INSERT policy for content_items table

  1. Problem
    - content_items table has RLS enabled but no INSERT policy
    - Users cannot insert new content items, causing RLS violations

  2. Solution
    - Add INSERT policy allowing users to insert content into sources they own
*/

-- Add INSERT policy for content_items table
CREATE POLICY "Users can insert content into own sources" ON content_items
  FOR INSERT TO authenticated
  WITH CHECK (source_id IN (
    SELECT id FROM content_sources WHERE user_id = auth.uid()
  ));

-- Also add INSERT and UPDATE policies for summaries table to prevent similar issues
CREATE POLICY "Users can insert summaries for own content" ON summaries
  FOR INSERT TO authenticated
  WITH CHECK (content_item_id IN (
    SELECT ci.id FROM content_items ci
    JOIN content_sources cs ON ci.source_id = cs.id
    WHERE cs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update summaries for own content" ON summaries
  FOR UPDATE TO authenticated
  USING (content_item_id IN (
    SELECT ci.id FROM content_items ci
    JOIN content_sources cs ON ci.source_id = cs.id
    WHERE cs.user_id = auth.uid()
  ));

-- Add UPDATE policy for content_items table
CREATE POLICY "Users can update content from own sources" ON content_items
  FOR UPDATE TO authenticated
  USING (source_id IN (
    SELECT id FROM content_sources WHERE user_id = auth.uid()
  ));

-- Add INSERT and UPDATE policies for digest_items table
CREATE POLICY "Users can insert own digest items" ON digest_items
  FOR INSERT TO authenticated
  WITH CHECK (digest_id IN (
    SELECT id FROM digests WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own digest items" ON digest_items
  FOR UPDATE TO authenticated
  USING (digest_id IN (
    SELECT id FROM digests WHERE user_id = auth.uid()
  ));