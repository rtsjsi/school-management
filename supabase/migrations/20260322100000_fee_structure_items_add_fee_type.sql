-- Fee structure items: one amount per (structure, fee_type, quarter).
-- Existing quarter-only rows become education_fee.

ALTER TABLE public.fee_structure_items
  ADD COLUMN IF NOT EXISTS fee_type TEXT NOT NULL DEFAULT 'education_fee';

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.fee_structure_items'::regclass
      AND c.contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.fee_structure_items DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.fee_structure_items
  ADD CONSTRAINT fee_structure_items_structure_fee_type_quarter_key
  UNIQUE (fee_structure_id, fee_type, quarter);

COMMENT ON COLUMN public.fee_structure_items.fee_type IS
  'Fee category (e.g. education_fee, transport_fee). Annual amount is split across quarters in the app.';

COMMENT ON TABLE public.fee_structure_items IS
  'Per-structure fee amounts per fee type and quarter.';
