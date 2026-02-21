-- Exams: link to academic year and mark promotion exam
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_promotion_exam BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_exams_academic_year ON public.exams(academic_year_id);

COMMENT ON COLUMN public.exams.academic_year_id IS 'Academic year this exam belongs to';
COMMENT ON COLUMN public.exams.is_promotion_exam IS 'Used for year-end pass/fail promotion decision';
