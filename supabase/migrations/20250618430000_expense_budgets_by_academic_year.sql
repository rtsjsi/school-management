-- Per-academic-year budgets for expense heads.
-- Each row represents the budget for one expense head in one academic year.

CREATE TABLE IF NOT EXISTS public.expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_head_id UUID NOT NULL REFERENCES public.expense_heads(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure one budget per head per academic year
ALTER TABLE public.expense_budgets
  ADD CONSTRAINT expense_budgets_head_year_key UNIQUE (expense_head_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_expense_budgets_head_year
  ON public.expense_budgets(expense_head_id, academic_year_id);

ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read expense_budgets"
  ON public.expense_budgets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage expense_budgets"
  ON public.expense_budgets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.expense_budgets IS 'Per-academic-year budget amounts for each expense head.';
COMMENT ON COLUMN public.expense_budgets.amount IS 'Budget amount for the head within the academic year.';

