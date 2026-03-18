-- Drop unused student fields

ALTER TABLE public.students
  DROP COLUMN IF EXISTS refer_name,
  DROP COLUMN IF EXISTS notes;

