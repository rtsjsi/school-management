-- Add additional student fields
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS previous_school_address TEXT,
  ADD COLUMN IF NOT EXISTS previous_school_state_unique_id TEXT,
  ADD COLUMN IF NOT EXISTS birth_certificate_number TEXT,
  ADD COLUMN IF NOT EXISTS permanent_address TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS mother_tongue TEXT;

