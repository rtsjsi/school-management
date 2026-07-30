-- Expense payments: partial/multiple payments against an expense bill.

CREATE TABLE IF NOT EXISTS public.expense_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'cheque', 'online')),
  cheque_number text,
  cheque_bank text,
  cheque_date date,
  transaction_reference_id text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS expense_payments_expense_id_idx
  ON public.expense_payments (expense_id);

CREATE INDEX IF NOT EXISTS expense_payments_payment_date_idx
  ON public.expense_payments (payment_date);

-- Speed duplicate bill lookups (voucher+date+party+amount checked in app)
CREATE INDEX IF NOT EXISTS expenses_date_amount_idx
  ON public.expenses (expense_date, amount);

ALTER TABLE public.expense_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read expense_payments" ON public.expense_payments;
CREATE POLICY "Authenticated can read expense_payments"
  ON public.expense_payments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can manage expense_payments" ON public.expense_payments;
CREATE POLICY "Authenticated can manage expense_payments"
  ON public.expense_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.expense_payments TO authenticated, anon, service_role;

-- Backfill: existing expenses that already recorded a payment mode become one full payment.
INSERT INTO public.expense_payments (
  expense_id,
  amount,
  payment_date,
  payment_mode,
  cheque_number,
  cheque_bank,
  cheque_date,
  transaction_reference_id,
  remarks
)
SELECT
  e.id,
  e.amount,
  e.expense_date,
  CASE
    WHEN lower(coalesce(e.account, '')) IN ('cash', 'cheque', 'online') THEN lower(e.account)
    WHEN upper(coalesce(e.account, '')) = 'CASH' THEN 'cash'
    ELSE 'cash'
  END,
  e.cheque_number,
  e.cheque_bank,
  e.cheque_date,
  e.transaction_reference_id,
  'Backfilled from expense entry'
FROM public.expenses e
WHERE e.amount > 0
  AND coalesce(nullif(btrim(e.account), ''), '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.expense_payments p WHERE p.expense_id = e.id
  );
