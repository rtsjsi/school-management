-- Unified naming: super_admin -> principal, grades -> standards, students.section -> division

-- 1. Role: rename enum value super_admin to principal
ALTER TYPE app_role RENAME VALUE 'super_admin' TO 'principal';

-- Update RLS policy name and condition (condition now uses 'principal')
DROP POLICY IF EXISTS "Super admin can manage all profiles" ON public.profiles;
CREATE POLICY "Principal can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'principal'
    )
  );

COMMENT ON TABLE public.profiles IS 'User profiles with role-based access (principal, admin, teacher)';

-- 2. Grades table -> standards (enrollment model)
ALTER TABLE IF EXISTS public.grades RENAME TO standards;

ALTER INDEX IF EXISTS idx_grades_sort RENAME TO idx_standards_sort;
ALTER TABLE public.standards RENAME CONSTRAINT grades_pkey TO standards_pkey;

DROP POLICY IF EXISTS "Authenticated can read grades" ON public.standards;
DROP POLICY IF EXISTS "Authenticated can manage grades" ON public.standards;
CREATE POLICY "Authenticated can read standards"
  ON public.standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage standards"
  ON public.standards FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.standards IS 'Standards (e.g. Std 1, 2); sort_order defines next standard and graduating';

-- divisions: grade_id -> standard_id
ALTER TABLE public.divisions RENAME COLUMN grade_id TO standard_id;
ALTER TABLE public.divisions DROP CONSTRAINT IF EXISTS divisions_grade_id_fkey;
ALTER TABLE public.divisions
  ADD CONSTRAINT divisions_standard_id_fkey
  FOREIGN KEY (standard_id) REFERENCES public.standards(id) ON DELETE CASCADE;

ALTER INDEX IF EXISTS idx_divisions_grade RENAME TO idx_divisions_standard;

-- student_enrollments: grade_id -> standard_id
ALTER TABLE public.student_enrollments RENAME COLUMN grade_id TO standard_id;
ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_grade_id_fkey;
ALTER TABLE public.student_enrollments
  ADD CONSTRAINT student_enrollments_standard_id_fkey
  FOREIGN KEY (standard_id) REFERENCES public.standards(id) ON DELETE RESTRICT;

-- 3. students: section -> division (column holds division name e.g. A, B)
ALTER TABLE public.students RENAME COLUMN section TO division;

DROP INDEX IF EXISTS idx_students_section;
CREATE INDEX IF NOT EXISTS idx_students_division ON public.students(division);

COMMENT ON COLUMN public.students.division IS 'Division name (e.g. A, B) within standard; synced from current enrollment';

-- 4. Update trigger: sync students from enrollment (use standards + division)
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
  WHERE ay.id = NEW.academic_year_id AND ay.is_active = true;
  IF ay_name IS NOT NULL THEN
    UPDATE public.students SET academic_year = ay_name, grade = g_name, division = d_name, updated_at = now() WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_students_from_enrollment ON public.student_enrollments;
CREATE TRIGGER trigger_sync_students_from_enrollment
  AFTER INSERT OR UPDATE OF standard_id, division_id, status ON public.student_enrollments
  FOR EACH ROW WHEN (NEW.status = 'active')
  EXECUTE PROCEDURE public.sync_students_from_current_enrollment();

-- One-time sync after column renames
UPDATE public.students s SET
  academic_year = ay.name,
  grade = g.name,
  division = d.name,
  updated_at = now()
FROM public.student_enrollments e
JOIN public.academic_years ay ON ay.id = e.academic_year_id AND ay.is_active = true
JOIN public.standards g ON g.id = e.standard_id
JOIN public.divisions d ON d.id = e.division_id
WHERE e.student_id = s.id AND e.status = 'active';
