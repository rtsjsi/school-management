-- Fee collections: optional link to enrollment for placement at time of payment
ALTER TABLE public.fee_collections
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES public.student_enrollments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fee_collections_enrollment ON public.fee_collections(enrollment_id);

COMMENT ON COLUMN public.fee_collections.enrollment_id IS 'Enrollment at time of payment for class/division reporting';

-- Backfill: set enrollment_id where we can match student_id + academic_year
UPDATE public.fee_collections fc
SET enrollment_id = (
  SELECT e.id FROM public.student_enrollments e
  JOIN public.academic_years ay ON ay.id = e.academic_year_id
  WHERE e.student_id = fc.student_id AND ay.name = fc.academic_year
  ORDER BY CASE e.status WHEN 'active' THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE fc.enrollment_id IS NULL;
