-- Salary deduction items: PF, TDS, advances, etc.
CREATE TABLE IF NOT EXISTS public.salary_deduction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('pf', 'tds', 'advance', 'other')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month_year, deduction_type)
);

ALTER TABLE public.salary_deduction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read salary_deduction_items" ON public.salary_deduction_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage salary_deduction_items" ON public.salary_deduction_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_salary_deduction_items_employee_month ON public.salary_deduction_items(employee_id, month_year);

COMMENT ON TABLE public.salary_deduction_items IS 'Per-employee per-month deduction items (PF, TDS, advances)';

-- Salary allowance items: HRA, transport, etc.
CREATE TABLE IF NOT EXISTS public.salary_allowance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  allowance_type TEXT NOT NULL CHECK (allowance_type IN ('hra', 'transport', 'medical', 'other')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month_year, allowance_type)
);

ALTER TABLE public.salary_allowance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read salary_allowance_items" ON public.salary_allowance_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage salary_allowance_items" ON public.salary_allowance_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_salary_allowance_items_employee_month ON public.salary_allowance_items(employee_id, month_year);

COMMENT ON TABLE public.salary_allowance_items IS 'Per-employee per-month allowance items (HRA, transport, medical)';

ANALYZE public.salary_deduction_items;
ANALYZE public.salary_allowance_items;
