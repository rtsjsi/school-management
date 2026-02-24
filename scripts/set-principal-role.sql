-- Insert a profile with principal role.
-- The user must already exist in auth.users (Dashboard → Authentication → Users).
-- Get their id from auth.users, then run this in Supabase Dashboard → SQL Editor.

INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- auth.users.id (required)
  'principal@school.com',
  'Principal Name',
  'principal'
)
ON CONFLICT (id) DO UPDATE SET role = 'principal', email = EXCLUDED.email, full_name = EXCLUDED.full_name;
