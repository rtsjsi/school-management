-- students.academic_year is no longer used by app logic.
-- Keep enrollment as source of truth for academic-year linkage.

ALTER TABLE public.students
DROP COLUMN IF EXISTS academic_year;

-- Update sync trigger function to stop writing removed academic_year column.
CREATE OR REPLACE FUNCTION public.sync_students_from_current_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  g_name TEXT;
  d_name TEXT;
BEGIN
  SELECT g.name, sd.name INTO g_name, d_name
  FROM public.academic_years ay
  JOIN public.standards g ON g.id = NEW.standard_id
  JOIN public.standard_divisions sd ON sd.id = NEW.division_id
  WHERE ay.id = NEW.academic_year_id AND ay.status = 'active';

  IF g_name IS NOT NULL THEN
    UPDATE public.students
    SET standard = g_name,
        division = d_name,
        updated_at = now()
    WHERE id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
