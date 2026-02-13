-- Run this in Supabase SQL Editor to make a user Super Admin.

-- Option 1: Update by email (replace with your login email)
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'your@email.com';

-- Option 2: Update by auth user id (from Authentication → Users in dashboard, copy User UID)
-- UPDATE public.profiles SET role = 'super_admin' WHERE id = 'user-uuid-here';

-- Verify:
-- SELECT id, email, role FROM public.profiles;
