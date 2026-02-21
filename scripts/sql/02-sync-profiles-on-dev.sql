-- Run this in Supabase DEV project (SQL Editor).
-- Paste the (email, full_name, role) rows from the prod export below.
-- Only updates profiles for users that already exist in dev (same email).
-- To create new users in dev, use: npm run sync-users:prod-to-dev

UPDATE public.profiles p
SET
  full_name = v.full_name,
  role = v.role::app_role,
  updated_at = now()
FROM (VALUES
  -- Paste rows from prod export here, one per line:
  -- ('email@example.com', 'Full Name', 'admin'),
  ('replace@with.prod.data', 'Name', 'teacher')
) AS v(email, full_name, role)
WHERE p.email = v.email;
