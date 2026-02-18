-- Fee concession and period label on collections
ALTER TABLE public.fee_collections
  ADD COLUMN IF NOT EXISTS concession_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (concession_amount >= 0),
  ADD COLUMN IF NOT EXISTS period_label TEXT;

COMMENT ON COLUMN public.fee_collections.concession_amount IS 'Concession/discount given for this payment';
COMMENT ON COLUMN public.fee_collections.period_label IS 'Human-readable period e.g. Dec - Feb';
