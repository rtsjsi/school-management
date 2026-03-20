-- Remove optional per-collection notes (UI field removed from fee collection form).

ALTER TABLE public.fee_collections
  DROP COLUMN IF EXISTS notes;
