-- Allow casual_leave (already used by the app) and leave_without_pay on finalized attendance.
-- leave_without_pay is used when a paid Saturday is sandwiched by Friday/Monday leave (weight 0).

ALTER TABLE public.employee_attendance_finalized
  DROP CONSTRAINT IF EXISTS employee_attendance_finalized_status_check;

ALTER TABLE public.employee_attendance_finalized
  ADD CONSTRAINT employee_attendance_finalized_status_check
  CHECK (
    status IN (
      'present',
      'absent',
      'half_day',
      'leave',
      'casual_leave',
      'leave_without_pay',
      'holiday',
      'week_off'
    )
  );
