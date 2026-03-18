-- Drop landmark columns from students structured addresses

ALTER TABLE public.students
  DROP COLUMN IF EXISTS present_landmark,
  DROP COLUMN IF EXISTS permanent_landmark;

