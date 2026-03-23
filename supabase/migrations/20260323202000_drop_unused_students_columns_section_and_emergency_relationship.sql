-- Drop unused legacy student columns no longer used by app forms/flows.
ALTER TABLE public.students
  DROP COLUMN IF EXISTS section,
  DROP COLUMN IF EXISTS emergency_contact_relationship;
