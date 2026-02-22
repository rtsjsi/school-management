-- Add cheque/online payment details to expenses (mirror fee_collections)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS cheque_number TEXT,
  ADD COLUMN IF NOT EXISTS cheque_bank TEXT,
  ADD COLUMN IF NOT EXISTS cheque_date DATE,
  ADD COLUMN IF NOT EXISTS transaction_reference_id TEXT;

COMMENT ON COLUMN public.expenses.cheque_number IS 'Cheque number when account/mode is cheque';
COMMENT ON COLUMN public.expenses.cheque_bank IS 'Bank name when payment is by cheque';
COMMENT ON COLUMN public.expenses.cheque_date IS 'Cheque date when payment is by cheque';
COMMENT ON COLUMN public.expenses.transaction_reference_id IS 'Transaction reference when payment is online';
