-- Expense heads: flexible categories (Stationary, Maintenance, Salary, etc.)
CREATE TABLE IF NOT EXISTS public.expense_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_heads_name ON public.expense_heads(name);
ALTER TABLE public.expense_heads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read expense_heads"
  ON public.expense_heads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage expense_heads"
  ON public.expense_heads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default expense heads
INSERT INTO public.expense_heads (name, sort_order) VALUES
  ('Stationary', 1),
  ('Maintenance', 2),
  ('Entertainment', 3),
  ('Christmas', 4),
  ('Medicines', 5),
  ('Science Lab', 6),
  ('Salary', 7),
  ('Utilities', 8),
  ('Transport', 9),
  ('Other', 99)
ON CONFLICT (name) DO NOTHING;

-- Add new columns to expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS voucher TEXT,
  ADD COLUMN IF NOT EXISTS expense_head_id UUID REFERENCES public.expense_heads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS party TEXT,
  ADD COLUMN IF NOT EXISTS expense_by TEXT,
  ADD COLUMN IF NOT EXISTS account TEXT DEFAULT 'CASH';

COMMENT ON COLUMN public.expenses.account IS 'Payment account (CASH, BANK, etc.)';

CREATE INDEX IF NOT EXISTS idx_expenses_expense_head ON public.expenses(expense_head_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_by ON public.expenses(expense_by);

COMMENT ON COLUMN public.expenses.voucher IS 'Voucher/reference number';
COMMENT ON COLUMN public.expenses.party IS 'Party/vendor name';
COMMENT ON COLUMN public.expenses.expense_by IS 'Person who made/authorized the expense';
