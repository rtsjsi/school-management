-- Biometric attendance upload + bank NEFT support
-- Defensive migration: base payroll tables are not all tracked in this repo,
-- so use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout.

-- 1. Employee master: biometric enrollment number (maps to ALOG EnNo)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS biometric_enroll_no text;

-- Unique only when set (multiple NULLs allowed)
CREATE UNIQUE INDEX IF NOT EXISTS employees_biometric_enroll_no_key
  ON public.employees (biometric_enroll_no)
  WHERE biometric_enroll_no IS NOT NULL;

-- 2. Attendance punches: ensure table + columns exist
CREATE TABLE IF NOT EXISTS public.employee_attendance_punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  punch_date date NOT NULL,
  punch_time timestamptz NOT NULL,
  punch_type text NOT NULL,
  is_late boolean DEFAULT false,
  is_early_departure boolean DEFAULT false,
  source text DEFAULT 'biometric',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.employee_attendance_punches ADD COLUMN IF NOT EXISTS punch_date date;
ALTER TABLE public.employee_attendance_punches ADD COLUMN IF NOT EXISTS punch_time timestamptz;
ALTER TABLE public.employee_attendance_punches ADD COLUMN IF NOT EXISTS punch_type text;
ALTER TABLE public.employee_attendance_punches ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT false;
ALTER TABLE public.employee_attendance_punches ADD COLUMN IF NOT EXISTS is_early_departure boolean DEFAULT false;
ALTER TABLE public.employee_attendance_punches ADD COLUMN IF NOT EXISTS source text DEFAULT 'biometric';

-- Re-uploads of the same biometric file must be idempotent
CREATE UNIQUE INDEX IF NOT EXISTS employee_attendance_punches_unique
  ON public.employee_attendance_punches (employee_id, punch_time, punch_type);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_punches_date
  ON public.employee_attendance_punches (punch_date);

GRANT ALL ON TABLE public.employee_attendance_punches TO authenticated, anon, service_role;
ALTER TABLE public.employee_attendance_punches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_attendance_punches_select" ON public.employee_attendance_punches;
CREATE POLICY "employee_attendance_punches_select" ON public.employee_attendance_punches
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "employee_attendance_punches_insert" ON public.employee_attendance_punches;
CREATE POLICY "employee_attendance_punches_insert" ON public.employee_attendance_punches
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "employee_attendance_punches_update" ON public.employee_attendance_punches;
CREATE POLICY "employee_attendance_punches_update" ON public.employee_attendance_punches
  FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "employee_attendance_punches_delete" ON public.employee_attendance_punches;
CREATE POLICY "employee_attendance_punches_delete" ON public.employee_attendance_punches
  FOR DELETE TO authenticated USING (true);

-- 3. Payroll settings (single-row): NEFT defaults + attendance hour thresholds
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id integer PRIMARY KEY DEFAULT 1,
  debit_account_number text,
  transaction_type text DEFAULT 'NEFT',
  currency text DEFAULT 'INR',
  remarks_prefix text DEFAULT 'Salary',
  full_day_hours numeric DEFAULT 6,
  half_day_hours numeric DEFAULT 3,
  custom_header_1 text,
  custom_header_2 text,
  custom_header_3 text,
  custom_header_4 text,
  custom_header_5 text,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  CONSTRAINT payroll_settings_singleton CHECK (id = 1)
);

INSERT INTO public.payroll_settings (id, debit_account_number, transaction_type, currency, remarks_prefix, full_day_hours, half_day_hours)
VALUES (1, '10078958844', 'NEFT', 'INR', 'Salary', 6, 3)
ON CONFLICT (id) DO NOTHING;

GRANT ALL ON TABLE public.payroll_settings TO authenticated, anon, service_role;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_settings_select" ON public.payroll_settings;
CREATE POLICY "payroll_settings_select" ON public.payroll_settings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "payroll_settings_insert" ON public.payroll_settings;
CREATE POLICY "payroll_settings_insert" ON public.payroll_settings
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "payroll_settings_update" ON public.payroll_settings;
CREATE POLICY "payroll_settings_update" ON public.payroll_settings
  FOR UPDATE TO authenticated USING (true);

-- 4. Attendance import batches (audit of each biometric upload)
CREATE TABLE IF NOT EXISTS public.attendance_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  file_name text,
  rows_parsed integer DEFAULT 0,
  rows_mapped integer DEFAULT 0,
  punches_upserted integer DEFAULT 0,
  unmapped_enrolls jsonb,
  uploaded_by uuid,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_import_batches_month
  ON public.attendance_import_batches (month_year);

GRANT ALL ON TABLE public.attendance_import_batches TO authenticated, anon, service_role;
ALTER TABLE public.attendance_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_import_batches_select" ON public.attendance_import_batches;
CREATE POLICY "attendance_import_batches_select" ON public.attendance_import_batches
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "attendance_import_batches_insert" ON public.attendance_import_batches;
CREATE POLICY "attendance_import_batches_insert" ON public.attendance_import_batches
  FOR INSERT TO authenticated WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
