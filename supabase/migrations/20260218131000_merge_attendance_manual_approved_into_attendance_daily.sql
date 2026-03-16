-- Merge attendance_manual and attendance_approved into a single daily employee attendance table.
-- Keep employee_attendance_punches (raw punches) and attendance_month_approvals (per-month approval) as-is.

CREATE TABLE IF NOT EXISTS public.employee_attendance_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave', 'holiday', 'week_off')),
  in_time TIME,
  out_time TIME,
  working_hours NUMERIC(5, 2),
  month_year TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'approved')),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

ALTER TABLE public.employee_attendance_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read employee_attendance_daily"
  ON public.employee_attendance_daily FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage employee_attendance_daily"
  ON public.employee_attendance_daily FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_daily_employee_date
  ON public.employee_attendance_daily(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_daily_month_year
  ON public.employee_attendance_daily(month_year);

COMMENT ON TABLE public.employee_attendance_daily IS
  'Merged daily employee attendance (manual + approved). Raw punches remain in employee_attendance_punches; month approvals in attendance_month_approvals.';

-- Backfill from attendance_approved (final snapshot).
INSERT INTO public.employee_attendance_daily (
  employee_id,
  attendance_date,
  status,
  in_time,
  out_time,
  working_hours,
  month_year,
  source,
  is_approved,
  approved_by,
  approved_at,
  remarks,
  created_at,
  updated_at
)
SELECT
  a.employee_id,
  a.attendance_date,
  a.status,
  a.in_time,
  a.out_time,
  a.working_hours,
  a.month_year,
  'approved'::text AS source,
  true AS is_approved,
  a.approved_by,
  a.approved_at,
  a.remarks,
  a.created_at,
  now() AS updated_at
FROM public.attendance_approved a
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

-- Backfill from attendance_manual where there is no approved row for that day.
INSERT INTO public.employee_attendance_daily (
  employee_id,
  attendance_date,
  status,
  in_time,
  out_time,
  month_year,
  source,
  is_approved,
  remarks,
  created_at,
  updated_at
)
SELECT
  m.employee_id,
  m.attendance_date,
  m.status,
  m.in_time,
  m.out_time,
  to_char(m.attendance_date, 'YYYY-MM') AS month_year,
  'manual'::text AS source,
  false AS is_approved,
  m.remarks,
  m.created_at,
  m.updated_at
FROM public.attendance_manual m
LEFT JOIN public.attendance_approved a
  ON a.employee_id = m.employee_id
 AND a.attendance_date = m.attendance_date
WHERE a.id IS NULL
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

-- Optionally drop old tables now that attendance_daily is used everywhere.
DO $$
BEGIN
  IF to_regclass('public.attendance_manual') IS NOT NULL THEN
    DROP TABLE public.attendance_manual;
  END IF;
  IF to_regclass('public.attendance_approved') IS NOT NULL THEN
    DROP TABLE public.attendance_approved;
  END IF;
END $$;

