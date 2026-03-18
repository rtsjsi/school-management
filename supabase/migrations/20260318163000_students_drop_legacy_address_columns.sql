-- Drop legacy, unstructured address fields from students.
-- These are replaced by structured present_* and permanent_* columns.

ALTER TABLE public.students
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS permanent_address,
  DROP COLUMN IF EXISTS district,
  DROP COLUMN IF EXISTS state;

