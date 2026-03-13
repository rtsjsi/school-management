-- Drop unused budget column from expense_heads now that per-year budgets
-- are stored in public.expense_budgets.

ALTER TABLE public.expense_heads
  DROP COLUMN IF EXISTS budget;

