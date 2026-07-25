-- Late grace period (minutes after shift start before first IN counts as late).
ALTER TABLE public.payroll_settings
  ADD COLUMN IF NOT EXISTS late_grace_minutes integer NOT NULL DEFAULT 15;

UPDATE public.payroll_settings
SET late_grace_minutes = 15
WHERE late_grace_minutes IS NULL OR late_grace_minutes < 0;
