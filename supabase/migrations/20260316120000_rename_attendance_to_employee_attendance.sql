-- Rename attendance tables to employee_attendance_* for clarity.
ALTER TABLE IF EXISTS public.attendance_daily
  RENAME TO employee_attendance_daily;

ALTER TABLE IF EXISTS public.attendance_punches
  RENAME TO employee_attendance_punches;

-- Rename related indexes if they exist.
DO $$
BEGIN
  IF to_regclass('public.idx_attendance_daily_employee_date') IS NOT NULL THEN
    ALTER INDEX public.idx_attendance_daily_employee_date RENAME TO idx_employee_attendance_daily_employee_date;
  END IF;

  IF to_regclass('public.idx_attendance_daily_month_year') IS NOT NULL THEN
    ALTER INDEX public.idx_attendance_daily_month_year RENAME TO idx_employee_attendance_daily_month_year;
  END IF;

  IF to_regclass('public.idx_attendance_punches_employee_date') IS NOT NULL THEN
    ALTER INDEX public.idx_attendance_punches_employee_date RENAME TO idx_employee_attendance_punches_employee_date;
  END IF;

  IF to_regclass('public.idx_attendance_punches_date') IS NOT NULL THEN
    ALTER INDEX public.idx_attendance_punches_date RENAME TO idx_employee_attendance_punches_date;
  END IF;
END $$;

