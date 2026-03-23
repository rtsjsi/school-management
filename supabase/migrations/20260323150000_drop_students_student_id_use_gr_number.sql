-- Remove legacy human-readable student_id; GR number is the identifier used by the app.
ALTER TABLE public.students
DROP COLUMN IF EXISTS student_id;
