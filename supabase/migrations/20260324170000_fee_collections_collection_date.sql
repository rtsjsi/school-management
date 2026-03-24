-- Rename fee_collections.collected_at -> collection_date and store date-only values.
ALTER TABLE public.fee_collections
  RENAME COLUMN collected_at TO collection_date;

ALTER TABLE public.fee_collections
  ALTER COLUMN collection_date TYPE DATE
  USING collection_date::date;

ALTER TABLE public.fee_collections
  ALTER COLUMN collection_date SET DEFAULT CURRENT_DATE;

DROP INDEX IF EXISTS public.idx_fee_collections_collected_at;

CREATE INDEX IF NOT EXISTS idx_fee_collections_collection_date
  ON public.fee_collections(collection_date);
