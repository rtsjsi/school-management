-- Drop legacy fees table and related FK since it is no longer used.

-- First drop FK and column from fee_collections if present.
ALTER TABLE public.fee_collections
  DROP CONSTRAINT IF EXISTS fee_collections_fee_id_fkey,
  DROP COLUMN IF EXISTS fee_id;

-- Then drop the fees table itself.
DROP TABLE IF EXISTS public.fees;

