-- Update student_enrollments.status allowed values:
--   (active, promoted, retained, expelled, transferred, withdrawn, graduated)

ALTER TABLE public.student_enrollments
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.student_enrollments
  DROP CONSTRAINT IF EXISTS student_enrollments_status_check;

ALTER TABLE public.student_enrollments
  ALTER COLUMN status SET DEFAULT 'active',
  ADD CONSTRAINT student_enrollments_status_check
    CHECK (status IN ('active', 'promoted', 'retained', 'expelled', 'transferred', 'withdrawn', 'graduated'));

-- Backfill old values, if any
UPDATE public.student_enrollments
SET status = 'expelled'
WHERE status = 'detained';

