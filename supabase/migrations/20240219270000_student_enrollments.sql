-- StudentEnrollment: single source of truth for placement; no mutation of students.grade/section
CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE RESTRICT,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'promoted', 'detained', 'transferred', 'withdrawn', 'graduated')),
  promoted_from_enrollment_id UUID REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one active enrollment per student per academic year (allows mid-year transfer: withdrawn + active)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_enrollment_per_student_year
  ON public.student_enrollments(student_id, academic_year_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_academic_year ON public.student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_year_status ON public.student_enrollments(academic_year_id, status);

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read student_enrollments"
  ON public.student_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage student_enrollments"
  ON public.student_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.student_enrollments IS 'Enrollment per student per academic year; placement lives here only';

-- Backfill: one row per student from students(grade, section, academic_year) -> grade_id, division_id
INSERT INTO public.student_enrollments (student_id, academic_year_id, grade_id, division_id, status)
SELECT s.id, ay.id, g.id, d.id, 'active'
FROM public.students s
JOIN public.academic_years ay ON ay.name = s.academic_year
JOIN public.grades g ON g.name = s.grade
JOIN public.divisions d ON d.grade_id = g.id AND d.name = s.section
WHERE s.grade IS NOT NULL AND s.section IS NOT NULL AND s.academic_year IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.student_enrollments e
    WHERE e.student_id = s.id AND e.academic_year_id = ay.id
  );
