-- Term-wise height and weight, stored with each student's term attendance row.

ALTER TABLE public.student_term_attendance
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,1),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2);

ALTER TABLE public.student_term_attendance
  DROP CONSTRAINT IF EXISTS student_term_attendance_height_nonnegative;

ALTER TABLE public.student_term_attendance
  ADD CONSTRAINT student_term_attendance_height_nonnegative
  CHECK (height_cm IS NULL OR height_cm >= 0);

ALTER TABLE public.student_term_attendance
  DROP CONSTRAINT IF EXISTS student_term_attendance_weight_nonnegative;

ALTER TABLE public.student_term_attendance
  ADD CONSTRAINT student_term_attendance_weight_nonnegative
  CHECK (weight_kg IS NULL OR weight_kg >= 0);
