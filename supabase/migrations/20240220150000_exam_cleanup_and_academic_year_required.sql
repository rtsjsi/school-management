-- Remove all exam-related data (exams, exam_subjects, exam_results, exam_result_subjects)
-- Then make academic_year_id required on exams so all new exams are scoped to a year.

-- Delete in order due to foreign keys (child tables first)
DELETE FROM public.exam_result_subjects;
DELETE FROM public.exam_subjects;
DELETE FROM public.exam_results;
DELETE FROM public.exams;

-- Require academic year for new exams
ALTER TABLE public.exams
  ALTER COLUMN academic_year_id SET NOT NULL;

COMMENT ON COLUMN public.exams.academic_year_id IS 'Academic year this exam belongs to (required)';
