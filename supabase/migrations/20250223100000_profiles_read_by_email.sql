-- Allow users to read the profile row that matches their email (from auth.users).
-- This fixes role resolution after a dev→main clone when auth user id and profile id
-- can be out of sync; the app can then resolve role by email without service role key.
CREATE POLICY "Users can read profile by own email"
  ON public.profiles FOR SELECT
  USING (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));
