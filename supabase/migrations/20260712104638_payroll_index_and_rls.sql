-- D1: Add month_year index on employee_attendance_finalized for faster monthly queries
CREATE INDEX IF NOT EXISTS idx_eaf_month_year
  ON public.employee_attendance_finalized (month_year);

-- S4: Tighten payroll_settings RLS — restrict INSERT/UPDATE to admin/principal/payroll roles
-- SELECT remains open to all authenticated users (needed for reading NEFT defaults)

DROP POLICY IF EXISTS "payroll_settings_insert" ON public.payroll_settings;
CREATE POLICY "payroll_settings_insert" ON public.payroll_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('principal', 'admin', 'payroll')
    )
  );

DROP POLICY IF EXISTS "payroll_settings_update" ON public.payroll_settings;
CREATE POLICY "payroll_settings_update" ON public.payroll_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('principal', 'admin', 'payroll')
    )
  );

NOTIFY pgrst, 'reload schema';
