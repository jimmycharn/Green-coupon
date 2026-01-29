-- =============================================
-- FIX: Drop problematic policy that causes infinite recursion
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;

-- The original "Public profiles are viewable by everyone" policy is already good
-- It allows everyone to view all profiles, which is needed for the app to work

-- If you want to restrict access later, use this simpler version instead:
-- (This uses auth.jwt() which doesn't query the profiles table)
-- CREATE POLICY "Authenticated users can view profiles"
--   ON profiles FOR SELECT
--   USING (auth.uid() IS NOT NULL);
