-- Only principal can create/update/delete academic years (including "set as current").
-- All authenticated users can read.

DROP POLICY IF EXISTS "Authenticated can manage academic_years" ON public.academic_years;

CREATE POLICY "Principal can manage academic_years"
  ON public.academic_years FOR ALL TO authenticated
  USING (public.current_user_is_principal())
  WITH CHECK (public.current_user_is_principal());

-- SELECT remains: "Authenticated can read academic_years" (already exists)
