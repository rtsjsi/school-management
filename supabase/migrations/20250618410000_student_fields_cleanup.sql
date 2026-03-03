-- Cleanup student master fields per latest requirements.
-- 1) Remove unused fields from students table that are no longer present in the UI:
--    Society, Phone, Email (basic info), Unique ID, Prev. school attendance,
--    Handicap, Minority, Is permanent, Hostel student, Food provided.

ALTER TABLE public.students
  DROP COLUMN IF EXISTS society,
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS unique_id,
  DROP COLUMN IF EXISTS prev_school_attendance,
  DROP COLUMN IF EXISTS handicap,
  DROP COLUMN IF EXISTS minority,
  DROP COLUMN IF EXISTS is_permanent,
  DROP COLUMN IF EXISTS hostel_student,
  DROP COLUMN IF EXISTS food_provided;

-- Drop dependent indexes if they exist
DROP INDEX IF EXISTS public.idx_students_email;

