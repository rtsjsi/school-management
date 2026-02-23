-- Revert post-clone workaround: remove policy that allowed reading profile by email.
-- Auth uses standard flow: profile is read by id (auth.uid() = profiles.id) only.
DROP POLICY IF EXISTS "Users can read profile by own email" ON public.profiles;
