-- Refactor fee_structures to be per-standard-per-academic-year.
-- Remove grade_from/grade_to/name and store standard_id instead.

ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS standard_id UUID REFERENCES public.standards(id) ON DELETE CASCADE;

-- Backfill standard_id from existing grade_from where possible.
UPDATE public.fee_structures fs
SET standard_id = s.id
FROM public.standards s
WHERE fs.grade_from = s.name
  AND fs.standard_id IS NULL;

-- From now on standard_id is required.
ALTER TABLE public.fee_structures
  ALTER COLUMN standard_id SET NOT NULL;

-- Drop legacy columns that used grade ranges and name.
ALTER TABLE public.fee_structures
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS grade_from,
  DROP COLUMN IF EXISTS grade_to;

COMMENT ON TABLE public.fee_structures IS
  'Fee structure definition for a specific standard and academic year.';

