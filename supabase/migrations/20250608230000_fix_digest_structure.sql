-- Fix digest structure and add missing RLS policies
-- This migration adds the missing content field to digests table
-- and ensures proper RLS policies for all tables

-- Add content field to digests table
ALTER TABLE digests ADD COLUMN IF NOT EXISTS content TEXT;

-- Add missing RLS policies for content_items
DROP POLICY IF EXISTS "Users can read content items" ON content_items;
CREATE POLICY "Users can read content items" ON content_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_sources cs
    WHERE cs.id = content_items.source_id
    AND cs.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert content items" ON content_items;
CREATE POLICY "Users can insert content items" ON content_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM content_sources cs
    WHERE cs.id = content_items.source_id
    AND cs.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update content items" ON content_items;
CREATE POLICY "Users can update content items" ON content_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_sources cs
    WHERE cs.id = content_items.source_id
    AND cs.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete content items" ON content_items;
CREATE POLICY "Users can delete content items" ON content_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_sources cs
    WHERE cs.id = content_items.source_id
    AND cs.user_id = auth.uid()
  )
);

-- Add missing RLS policies for summaries
DROP POLICY IF EXISTS "Users can read summaries" ON summaries;
CREATE POLICY "Users can read summaries" ON summaries
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_items ci
    JOIN content_sources cs ON cs.id = ci.source_id
    WHERE ci.id = summaries.content_item_id
    AND cs.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert summaries" ON summaries;
CREATE POLICY "Users can insert summaries" ON summaries
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM content_items ci
    JOIN content_sources cs ON cs.id = ci.source_id
    WHERE ci.id = summaries.content_item_id
    AND cs.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update summaries" ON summaries;
CREATE POLICY "Users can update summaries" ON summaries
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_items ci
    JOIN content_sources cs ON cs.id = ci.source_id
    WHERE ci.id = summaries.content_item_id
    AND cs.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete summaries" ON summaries;
CREATE POLICY "Users can delete summaries" ON summaries
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM content_items ci
    JOIN content_sources cs ON cs.id = ci.source_id
    WHERE ci.id = summaries.content_item_id
    AND cs.user_id = auth.uid()
  )
);

-- Add missing RLS policies for digest_items
DROP POLICY IF EXISTS "Users can read digest items" ON digest_items;
CREATE POLICY "Users can read digest items" ON digest_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM digests d
    WHERE d.id = digest_items.digest_id
    AND d.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert digest items" ON digest_items;
CREATE POLICY "Users can insert digest items" ON digest_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM digests d
    WHERE d.id = digest_items.digest_id
    AND d.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update digest items" ON digest_items;
CREATE POLICY "Users can update digest items" ON digest_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM digests d
    WHERE d.id = digest_items.digest_id
    AND d.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete digest items" ON digest_items;
CREATE POLICY "Users can delete digest items" ON digest_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM digests d
    WHERE d.id = digest_items.digest_id
    AND d.user_id = auth.uid()
  )
); 