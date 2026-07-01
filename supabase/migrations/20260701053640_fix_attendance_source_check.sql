ALTER TABLE public.employee_attendance_daily DROP CONSTRAINT IF EXISTS attendance_daily_source_check;
ALTER TABLE public.employee_attendance_daily ADD CONSTRAINT attendance_daily_source_check 
  CHECK (source IN ('manual', 'approved', 'biometric', 'holiday', 'weekend', 'default'));
