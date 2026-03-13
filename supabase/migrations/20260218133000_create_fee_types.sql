-- Master table for fee types used across the app (tuition, transport, etc.).

CREATE TABLE IF NOT EXISTS public.fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read fee_types"
  ON public.fee_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage fee_types"
  ON public.fee_types FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fee_types_active_order
  ON public.fee_types(is_active, sort_order, name);

COMMENT ON TABLE public.fee_types IS 'Master list of fee types (tuition, transport, etc.) used in fee structures and entries.';

