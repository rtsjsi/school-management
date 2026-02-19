-- Add collected_by to fee_collections (logged-in user who collected the fee)
ALTER TABLE public.fee_collections
  ADD COLUMN IF NOT EXISTS collected_by TEXT;

COMMENT ON COLUMN public.fee_collections.collected_by IS 'Name/email of user who collected the fee';
