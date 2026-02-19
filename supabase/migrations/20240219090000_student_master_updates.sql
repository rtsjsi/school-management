-- Add UDISE ID, GR Number, Second Language to students
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS udise_id TEXT,
ADD COLUMN IF NOT EXISTS gr_number TEXT,
ADD COLUMN IF NOT EXISTS second_language TEXT CHECK (second_language IN ('English', 'Hindi', NULL));

COMMENT ON COLUMN public.students.udise_id IS 'UDISE school ID';
COMMENT ON COLUMN public.students.gr_number IS 'GR Number';
COMMENT ON COLUMN public.students.second_language IS 'Second language: English or Hindi';
