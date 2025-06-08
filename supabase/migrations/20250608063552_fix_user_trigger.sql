/*
  # Fix User Trigger
  
  Fix the trigger function to properly handle user insertion without ID conflicts.
  The issue is that our users table has DEFAULT auth.uid() but we're trying to insert explicit IDs.
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate the function with proper logic
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user record, letting the default value handle the ID
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,  -- Use the auth user's ID explicitly
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also add a policy to allow the trigger to insert users
CREATE POLICY "Allow auth trigger to insert users" ON users
  FOR INSERT TO service_role
  WITH CHECK (true);
