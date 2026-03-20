-- Optional total / FRC fee for a structure — set manually in the app or SQL (not auto-calculated).

ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS total_fees NUMERIC(12, 2);

-- Remove trigger/function if an older draft of this migration was applied.
DROP TRIGGER IF EXISTS trigger_sync_fee_structure_total_fees ON public.fee_structure_items;
DROP FUNCTION IF EXISTS public.sync_fee_structure_total_fees();

ALTER TABLE public.fee_structures
  ALTER COLUMN total_fees DROP NOT NULL;

ALTER TABLE public.fee_structures
  ALTER COLUMN total_fees DROP DEFAULT;

COMMENT ON COLUMN public.fee_structures.total_fees IS
  'Optional total / FRC fee amount (entered manually).';
