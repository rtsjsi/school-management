-- Class-based access: which standards/divisions a user (profile) can access.
-- Principal and Admin are not restricted (handled in application).
-- Teachers and auditors see only data for their assigned classes.

CREATE TABLE IF NOT EXISTS public.profile_allowed_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  division_id UUID REFERENCES public.divisions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, standard_id, division_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_allowed_classes_profile ON public.profile_allowed_classes(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_allowed_classes_standard ON public.profile_allowed_classes(standard_id);
CREATE INDEX IF NOT EXISTS idx_profile_allowed_classes_division ON public.profile_allowed_classes(division_id);

ALTER TABLE public.profile_allowed_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own allowed classes"
  ON public.profile_allowed_classes FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

-- Principal can manage all (for admin UI)
CREATE POLICY "Principal can manage profile_allowed_classes"
  ON public.profile_allowed_classes FOR ALL TO authenticated
  USING (public.current_user_is_principal())
  WITH CHECK (public.current_user_is_principal());

COMMENT ON TABLE public.profile_allowed_classes IS 'Which standards/divisions a user can access (teachers/auditors). Principal/Admin unrestricted in app.';
