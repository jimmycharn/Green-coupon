-- =============================================
-- ADMIN USER MANAGEMENT SCRIPT
-- Use this script in Supabase SQL Editor to create Shop or Staff accounts
-- =============================================

-- 1. Create a function to easily create users (Optional but helpful)
-- Note: You usually create users via Auth > Users in Dashboard, 
-- but this script helps set their ROLE and DETAILS correctly.

-- INSTRUCTIONS:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Invite User" or "Create User"
-- 3. Create the user with email and password
-- 4. AFTER creating the user, run the SQL below to set their role

-- REPLACE 'shop@school.com' WITH THE EMAIL YOU JUST CREATED
-- REPLACE 'shop' WITH 'staff' IF CREATING A STAFF MEMBER

UPDATE profiles
SET 
  role = 'shop', -- or 'staff'
  full_name = 'ร้านค้าสหกรณ์ 1', -- Set the display name
  student_id = NULL -- Shops/Staff don't need student ID
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'shop@school.com'
);

-- EXAMPLE FOR STAFF:
/*
UPDATE profiles
SET 
  role = 'staff',
  full_name = 'จุดขายคูปอง 1',
  student_id = NULL
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'staff@school.com'
);
*/

-- CHECK ALL USERS AND ROLES
SELECT email, role, full_name, student_id 
FROM profiles 
JOIN auth.users ON profiles.id = auth.users.id;
