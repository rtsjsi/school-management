-- Academic years: replace is_active flag with explicit status column.
-- Status values:
--   active  - current academic year
--   closed  - past years
--   future  - upcoming years

ALTER TABLE public.academic_years
  ADD COLUMN IF NOT EXISTS status TEXT
  CHECK (status IN ('active', 'closed', 'future'))
  DEFAULT 'future';

-- Backfill status from is_active and sort_order if needed.
DO $$
DECLARE
  active_sort INTEGER;
BEGIN
  SELECT sort_order INTO active_sort
  FROM public.academic_years
  WHERE is_active = true
  ORDER BY sort_order
  LIMIT 1;

  UPDATE public.academic_years ay
  SET status = CASE
    WHEN ay.is_active = true THEN 'active'
    WHEN active_sort IS NOT NULL AND ay.sort_order < active_sort THEN 'closed'
    ELSE 'future'
  END
  WHERE ay.status IS NULL;
END $$;

-- Drop old index and trigger logic based on is_active.
DROP INDEX IF EXISTS idx_academic_years_is_active;
DROP TRIGGER IF EXISTS trigger_single_active_academic_year ON public.academic_years;
DROP FUNCTION IF EXISTS public.enforce_single_active_academic_year();

-- Remove is_active column now that status is in use.
ALTER TABLE public.academic_years
  DROP COLUMN IF EXISTS is_active;

-- Update sync_students_from_current_enrollment to use status = 'active'.
CREATE OR REPLACE FUNCTION public.sync_students_from_current_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  ay_name TEXT;
  g_name TEXT;
  d_name TEXT;
BEGIN
  SELECT ay.name, g.name, d.name INTO ay_name, g_name, d_name
  FROM public.academic_years ay
  JOIN public.standards g ON g.id = NEW.standard_id
  JOIN public.divisions d ON d.id = NEW.division_id
  WHERE ay.id = NEW.academic_year_id AND ay.status = 'active';

  IF ay_name IS NOT NULL THEN
    UPDATE public.students
    SET academic_year = ay_name,
        grade = g_name,
        division = d_name,
        updated_at = now()
    WHERE id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

