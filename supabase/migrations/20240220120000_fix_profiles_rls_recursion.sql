-- Fix infinite recursion: policies that check profiles.role trigger RLS on profiles,
-- which again checks profiles -> recursion. Use a SECURITY DEFINER function so
-- the role check runs with definer privileges (no RLS on profiles during check).

CREATE OR REPLACE FUNCTION public.current_user_is_principal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'principal'
  );
$$;

COMMENT ON FUNCTION public.current_user_is_principal() IS 'Returns true if the current user has role principal; used by RLS to avoid recursion when reading profiles.';

GRANT EXECUTE ON FUNCTION public.current_user_is_principal() TO authenticated;

-- school_settings: use function instead of subquery on profiles
DROP POLICY IF EXISTS "Principal can manage school_settings" ON public.school_settings;
CREATE POLICY "Principal can manage school_settings"
  ON public.school_settings FOR ALL TO authenticated
  USING (public.current_user_is_principal())
  WITH CHECK (public.current_user_is_principal());

-- profiles: "Principal can manage all profiles" must not SELECT from profiles in the policy
DROP POLICY IF EXISTS "Principal can manage all profiles" ON public.profiles;
CREATE POLICY "Principal can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.current_user_is_principal());
