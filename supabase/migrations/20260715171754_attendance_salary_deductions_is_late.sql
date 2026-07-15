-- Persist first-IN lateness for salary calc: floor(late_ins / 3) = days deducted.
-- Sandwich Fri/Mon leave deductions are computed at payroll time (no Saturday status rewrite).

ALTER TABLE public.employee_attendance_finalized
  ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.employee_attendance_finalized.is_late IS
  'True when first IN punch of the day is after employee shift_start_time. Used for salary: floor(count/3) days deducted.';
