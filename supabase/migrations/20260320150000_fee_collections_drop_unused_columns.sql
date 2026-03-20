-- Remove fee_collections columns not used by the app (no UI / queries).

DROP INDEX IF EXISTS public.idx_fee_collections_enrollment;

ALTER TABLE public.fee_collections
  DROP COLUMN IF EXISTS enrollment_id,
  DROP COLUMN IF EXISTS concession_amount,
  DROP COLUMN IF EXISTS period_label;
