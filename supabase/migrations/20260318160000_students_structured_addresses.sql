-- Structured addresses for students (present + permanent)
-- Keep legacy columns (address/permanent_address/district/state) for compatibility; app will populate them from structured fields.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS present_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS present_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS present_landmark TEXT,
  ADD COLUMN IF NOT EXISTS present_city TEXT,
  ADD COLUMN IF NOT EXISTS present_taluka TEXT,
  ADD COLUMN IF NOT EXISTS present_district TEXT,
  ADD COLUMN IF NOT EXISTS present_state TEXT,
  ADD COLUMN IF NOT EXISTS present_pincode TEXT,
  ADD COLUMN IF NOT EXISTS present_country TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS permanent_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS permanent_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS permanent_landmark TEXT,
  ADD COLUMN IF NOT EXISTS permanent_city TEXT,
  ADD COLUMN IF NOT EXISTS permanent_taluka TEXT,
  ADD COLUMN IF NOT EXISTS permanent_district TEXT,
  ADD COLUMN IF NOT EXISTS permanent_state TEXT,
  ADD COLUMN IF NOT EXISTS permanent_pincode TEXT,
  ADD COLUMN IF NOT EXISTS permanent_country TEXT DEFAULT 'India';

-- Lightweight indexes for common filtering/search (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_students_present_pincode ON public.students(present_pincode);
CREATE INDEX IF NOT EXISTS idx_students_present_city ON public.students(present_city);
CREATE INDEX IF NOT EXISTS idx_students_present_state ON public.students(present_state);

-- Backfill best-effort from legacy columns for existing rows.
-- (We cannot reliably parse legacy address into structured parts, so we keep it in line1 and carry district/state.)
UPDATE public.students
SET
  present_address_line1 = COALESCE(NULLIF(present_address_line1, ''), address),
  present_district = COALESCE(NULLIF(present_district, ''), district),
  present_state = COALESCE(NULLIF(present_state, ''), state),
  permanent_address_line1 = COALESCE(NULLIF(permanent_address_line1, ''), permanent_address),
  permanent_district = COALESCE(NULLIF(permanent_district, ''), district),
  permanent_state = COALESCE(NULLIF(permanent_state, ''), state)
WHERE
  address IS NOT NULL
  OR permanent_address IS NOT NULL
  OR district IS NOT NULL
  OR state IS NOT NULL;

