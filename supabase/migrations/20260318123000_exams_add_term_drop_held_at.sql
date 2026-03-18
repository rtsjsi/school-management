-- Add term to exams, remove held_at (start date)
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS term TEXT;

CREATE INDEX IF NOT EXISTS idx_exams_term ON public.exams(term);

DROP INDEX IF EXISTS public.idx_exams_held_at;

ALTER TABLE public.exams
  DROP COLUMN IF EXISTS held_at;

