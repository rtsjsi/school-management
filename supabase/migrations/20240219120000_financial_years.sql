-- Financial/Academic years for LOV
CREATE TABLE IF NOT EXISTS public.financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_years_sort ON public.financial_years(sort_order);
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read financial_years"
  ON public.financial_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage financial_years"
  ON public.financial_years FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.financial_years IS 'Financial/Academic years for dropdowns (e.g. 2024-2025)';

-- Seed common years
INSERT INTO public.financial_years (name, sort_order) VALUES
  ('2024-2025', 1),
  ('2025-2026', 2),
  ('2026-2027', 3),
  ('2027-2028', 4),
  ('2028-2029', 5)
ON CONFLICT (name) DO NOTHING;
