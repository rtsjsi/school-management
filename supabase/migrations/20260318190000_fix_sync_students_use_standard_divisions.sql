-- Fix sync_students_from_current_enrollment to use standard_divisions (divisions table was dropped).
CREATE OR REPLACE FUNCTION public.sync_students_from_current_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  ay_name TEXT;
  g_name TEXT;
  d_name TEXT;
BEGIN
  SELECT ay.name, g.name, sd.name INTO ay_name, g_name, d_name
  FROM public.academic_years ay
  JOIN public.standards g ON g.id = NEW.standard_id
  JOIN public.standard_divisions sd ON sd.id = NEW.division_id
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
