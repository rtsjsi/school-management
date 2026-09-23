-- Late arrival is counted from shift start. The grace window is removed.
ALTER TABLE public.payroll_settings
  DROP COLUMN IF EXISTS late_grace_minutes;
