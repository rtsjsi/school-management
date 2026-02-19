-- Max marks per exam per subject (instead of on subject)
-- Each exam can have different max marks for the same subject

CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  max_marks NUMERIC(6, 2) NOT NULL CHECK (max_marks > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam ON public.exam_subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_subject ON public.exam_subjects(subject_id);

ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read exam_subjects" ON public.exam_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage exam_subjects" ON public.exam_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.exam_subjects IS 'Max marks per subject per exam - each exam can have different max marks';

-- Remove max_marks from subjects (no longer needed there)
ALTER TABLE public.subjects DROP COLUMN IF EXISTS max_marks;
