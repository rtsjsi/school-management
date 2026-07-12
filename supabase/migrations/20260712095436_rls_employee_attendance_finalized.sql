GRANT ALL ON TABLE public.employee_attendance_finalized TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "employee_attendance_finalized_select" ON public.employee_attendance_finalized;
CREATE POLICY "employee_attendance_finalized_select" ON public.employee_attendance_finalized
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "employee_attendance_finalized_insert" ON public.employee_attendance_finalized;
CREATE POLICY "employee_attendance_finalized_insert" ON public.employee_attendance_finalized
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "employee_attendance_finalized_update" ON public.employee_attendance_finalized;
CREATE POLICY "employee_attendance_finalized_update" ON public.employee_attendance_finalized
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "employee_attendance_finalized_delete" ON public.employee_attendance_finalized;
CREATE POLICY "employee_attendance_finalized_delete" ON public.employee_attendance_finalized
  FOR DELETE TO authenticated USING (true);
