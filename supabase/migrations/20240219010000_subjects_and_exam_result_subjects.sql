-- Subjects master (e.g. English, Maths, Science)
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subjects_sort ON public.subjects(sort_order);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read subjects"
  ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage subjects"
  ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.subjects IS 'Subject master for exam marks (e.g. English, Maths)';

-- Subject-wise exam marks (one row per exam, student, subject)
CREATE TABLE public.exam_result_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  score NUMERIC(6, 2),
  max_score NUMERIC(6, 2),
  is_absent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id, subject_id)
);

CREATE INDEX idx_exam_result_subjects_exam ON public.exam_result_subjects(exam_id);
CREATE INDEX idx_exam_result_subjects_student ON public.exam_result_subjects(student_id);
CREATE INDEX idx_exam_result_subjects_subject ON public.exam_result_subjects(subject_id);

ALTER TABLE public.exam_result_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read exam_result_subjects"
  ON public.exam_result_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage exam_result_subjects"
  ON public.exam_result_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.exam_result_subjects IS 'Marks per student per subject per exam; is_absent for absent entry';

-- Seed default subjects
INSERT INTO public.subjects (name, code, sort_order) VALUES
  ('English', 'EN', 1),
  ('Mathematics', 'MATH', 2),
  ('Science', 'SCI', 3),
  ('Social Science', 'SS', 4),
  ('Hindi', 'HIN', 5),
  ('Computer', 'COMP', 6),
  ('General Knowledge', 'GK', 7),
  ('Physical Education', 'PE', 8),
  ('Other', 'OTH', 99)
ON CONFLICT (name) DO NOTHING;
