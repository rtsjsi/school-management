-- Rename students.grade -> students.standard (class/level name, not exam grade).

ALTER TABLE public.students RENAME COLUMN grade TO standard;

DROP INDEX IF EXISTS idx_students_grade;
CREATE INDEX idx_students_standard ON public.students(standard);
COMMENT ON INDEX idx_students_standard IS 'Speeds up filtering students by standard (class level).';

-- Update trigger function to write to students.standard
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
        standard = g_name,
        division = d_name,
        updated_at = now()
    WHERE id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN public.students.standard IS 'Current standard (class level) name, e.g. Primary 1, Secondary 6; synced from enrollment.';
