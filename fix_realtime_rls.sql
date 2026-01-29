-- =============================================
-- FIX RLS FOR REALTIME TO WORK
-- Run this in Supabase SQL Editor
-- =============================================

-- First, drop all existing policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Create simple policies that work with Realtime

-- 1. Anyone authenticated can view any profile (needed for Realtime)
CREATE POLICY "Allow authenticated read access"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2. Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Allow inserts (for the trigger that creates profile on signup)
CREATE POLICY "Allow insert for authenticated"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Service role can do anything (for the trigger)
CREATE POLICY "Service role full access"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- TRANSACTIONS TABLE POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON transactions;

-- 1. Users can view transactions they are involved in
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 2. Authenticated users can insert transactions
CREATE POLICY "Authenticated can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Service role full access
CREATE POLICY "Service role full access on transactions"
  ON transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- VERIFY REALTIME IS ENABLED
-- =============================================

-- Make sure tables are in the realtime publication
-- (This might error if already added, that's OK)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Done! Now refresh your browser and test again.
