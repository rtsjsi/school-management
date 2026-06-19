ALTER TABLE public.student_enrollments
ADD COLUMN IF NOT EXISTS exit_date date,
ADD COLUMN IF NOT EXISTS exit_reason text,
ADD COLUMN IF NOT EXISTS exit_notes text,
ADD COLUMN IF NOT EXISTS reenrollment_date date,
ADD COLUMN IF NOT EXISTS reenrollment_reason text;
