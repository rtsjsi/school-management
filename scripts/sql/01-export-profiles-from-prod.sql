-- Run this in Supabase PROD project (SQL Editor):
-- Exports email, full_name, role for all profiles. Copy the result.

SELECT email, full_name, role
FROM public.profiles
ORDER BY email;
