-- Fee structure items: one row per quarter only (annual fee is split in the app when saving).
-- Existing rows cleared — re-enter structures after this migration (dev).

DELETE FROM public.fee_structure_items;

-- Drop any UNIQUE constraint on fee_structure_items (name varies by Postgres version).
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
  DROP COLUMN IF EXISTS fee_type;

ALTER TABLE public.fee_structure_items
  ADD CONSTRAINT fee_structure_items_structure_quarter_key UNIQUE (fee_structure_id, quarter);

COMMENT ON TABLE public.fee_structure_items IS
  'Per-structure fee amount per quarter; annual total is split into Q1–Q4 when saving.';
