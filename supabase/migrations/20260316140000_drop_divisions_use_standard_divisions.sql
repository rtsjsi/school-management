-- Switch FKs from divisions -> standard_divisions and drop obsolete divisions table.

-- 1) student_enrollments.division_id FK -> standard_divisions(id)
ALTER TABLE public.student_enrollments
  DROP CONSTRAINT IF EXISTS student_enrollments_division_id_fkey;

ALTER TABLE public.student_enrollments
  ADD CONSTRAINT student_enrollments_division_id_fkey
  FOREIGN KEY (division_id) REFERENCES public.standard_divisions(id) ON DELETE RESTRICT;

-- 2) profile_allowed_classes.division_id FK -> standard_divisions(id)
ALTER TABLE public.profile_allowed_classes
  DROP CONSTRAINT IF EXISTS profile_allowed_classes_division_id_fkey;

ALTER TABLE public.profile_allowed_classes
  ADD CONSTRAINT profile_allowed_classes_division_id_fkey
  FOREIGN KEY (division_id) REFERENCES public.standard_divisions(id) ON DELETE CASCADE;

-- 3) Drop old divisions table if it still exists.
DROP TABLE IF EXISTS public.divisions;

