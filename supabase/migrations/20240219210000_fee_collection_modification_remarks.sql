-- Add modification_remarks for audit when fee collection is edited
ALTER TABLE public.fee_collections
  ADD COLUMN IF NOT EXISTS modification_remarks TEXT;

COMMENT ON COLUMN public.fee_collections.modification_remarks IS 'Compulsory remarks when payment mode or other editable fields are modified';
