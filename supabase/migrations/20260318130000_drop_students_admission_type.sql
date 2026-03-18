-- Remove admission_type from students
ALTER TABLE public.students
  DROP COLUMN IF EXISTS admission_type;

