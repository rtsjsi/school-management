-- Phase 1: keep students.grade, students.section, students.academic_year in sync with current enrollment
CREATE OR REPLACE FUNCTION public.sync_students_from_current_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  ay_name TEXT;
  g_name TEXT;
  d_name TEXT;
BEGIN
  -- Only sync when this enrollment is for the active academic year
  SELECT ay.name, g.name, d.name INTO ay_name, g_name, d_name
  FROM public.academic_years ay
  JOIN public.grades g ON g.id = NEW.grade_id
  JOIN public.divisions d ON d.id = NEW.division_id
  WHERE ay.id = NEW.academic_year_id AND ay.is_active = true;
  IF ay_name IS NOT NULL THEN
    UPDATE public.students SET academic_year = ay_name, grade = g_name, section = d_name, updated_at = now() WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fire when enrollment is inserted or updated (active only)
DROP TRIGGER IF EXISTS trigger_sync_students_from_enrollment ON public.student_enrollments;
CREATE TRIGGER trigger_sync_students_from_enrollment
  AFTER INSERT OR UPDATE OF grade_id, division_id, status ON public.student_enrollments
  FOR EACH ROW WHEN (NEW.status = 'active')
  EXECUTE PROCEDURE public.sync_students_from_current_enrollment();

-- One-time sync: backfill students from current active enrollments
UPDATE public.students s SET
  academic_year = ay.name,
  grade = g.name,
  section = d.name,
  updated_at = now()
FROM public.student_enrollments e
JOIN public.academic_years ay ON ay.id = e.academic_year_id AND ay.is_active = true
JOIN public.grades g ON g.id = e.grade_id
JOIN public.divisions d ON d.id = e.division_id
WHERE e.student_id = s.id AND e.status = 'active';
