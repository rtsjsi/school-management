-- Drop unused is_promotion_exam column from exams (promotion is no longer exam-based).

ALTER TABLE public.exams
  DROP COLUMN IF EXISTS is_promotion_exam;
