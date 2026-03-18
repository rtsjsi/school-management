-- Remove exam_type from exams (replaced by exam naming / term in app if needed)
DROP INDEX IF EXISTS public.idx_exams_exam_type;
ALTER TABLE public.exams DROP COLUMN IF EXISTS exam_type;
