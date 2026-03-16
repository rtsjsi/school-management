-- Rename monthly attendance approvals to employee_attendance_approvals for clarity.
ALTER TABLE IF EXISTS public.attendance_month_approvals
  RENAME TO employee_attendance_approvals;

-- Rename related index if it exists.
DO $$
BEGIN
  IF to_regclass('public.idx_attendance_month_approvals_month') IS NOT NULL THEN
    ALTER INDEX public.idx_attendance_month_approvals_month RENAME TO idx_employee_attendance_approvals_month;
  END IF;
END $$;

