-- Drop legacy exam_results table now that exam_result_subjects is used everywhere.

DO $$
BEGIN
  IF to_regclass('public.exam_results') IS NOT NULL THEN
    DROP TABLE public.exam_results;
  END IF;
END $$;

