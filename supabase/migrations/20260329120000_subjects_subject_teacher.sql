-- Optional subject teacher (employee) per subject row
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS subject_teacher_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_subject_teacher_id ON public.subjects(subject_teacher_id);

COMMENT ON COLUMN public.subjects.subject_teacher_id IS 'Employee assigned as subject teacher (optional)';
