/*
  # Remove Default auth.uid() from users.id
  
  Remove the DEFAULT auth.uid() from users.id column to avoid conflicts with trigger insertion.
*/

-- Remove the default value from users.id column
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- Ensure we have proper RLS policies for service role (used by triggers)
DROP POLICY IF EXISTS "Allow auth trigger to insert users" ON users;

-- Create a more specific policy for auth operations
CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role to insert (for triggers)
CREATE POLICY "Service role can insert users" ON users
  FOR INSERT TO service_role
  WITH CHECK (true);
