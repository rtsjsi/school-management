-- Add budget column to expense_heads
ALTER TABLE public.expense_heads
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12, 2) CHECK (budget IS NULL OR budget >= 0);

COMMENT ON COLUMN public.expense_heads.budget IS 'Budget amount for this expense head; remaining = budget - sum(expenses)';
