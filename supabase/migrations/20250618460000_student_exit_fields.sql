-- Student exit (soft delete) fields.
-- Keep full student history but allow marking as inactive with exit metadata.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS exit_date DATE,
  ADD COLUMN IF NOT EXISTS exit_reason TEXT,
  ADD COLUMN IF NOT EXISTS exit_notes TEXT;

