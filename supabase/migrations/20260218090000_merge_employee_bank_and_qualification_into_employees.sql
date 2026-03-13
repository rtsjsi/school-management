-- Merge employee bank and qualification info into employees table.

-- 1) Add columns on employees for single bank account and single qualification.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS degree TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS year_passed INTEGER,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
  ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

-- 2) One-time backfill from existing employee_qualifications and employee_bank_accounts (if they exist).
DO $$
BEGIN
  IF to_regclass('public.employee_qualifications') IS NOT NULL THEN
    UPDATE public.employees e
    SET
      degree = q.degree,
      institution = q.institution,
      year_passed = q.year_passed
    FROM (
      SELECT DISTINCT ON (employee_id)
        employee_id,
        degree,
        institution,
        year_passed
      FROM public.employee_qualifications
      ORDER BY employee_id, created_at DESC
    ) q
    WHERE q.employee_id = e.id
      AND e.degree IS NULL;
  END IF;

  IF to_regclass('public.employee_bank_accounts') IS NOT NULL THEN
    UPDATE public.employees e
    SET
      bank_name = b.bank_name,
      account_number = b.account_number,
      ifsc_code = b.ifsc_code,
      account_holder_name = b.account_holder_name
    FROM (
      SELECT DISTINCT ON (employee_id)
        employee_id,
        bank_name,
        account_number,
        ifsc_code,
        account_holder_name
      FROM public.employee_bank_accounts
      WHERE COALESCE(is_primary, true) = true
      ORDER BY employee_id, created_at DESC
    ) b
    WHERE b.employee_id = e.id
      AND e.bank_name IS NULL
      AND e.account_number IS NULL;
  END IF;
END $$;

-- 3) Optionally keep the old tables for history but prevent new usage, or drop them.
-- For now we DROP them since the application will no longer reference them.
DO $$
BEGIN
  IF to_regclass('public.employee_qualifications') IS NOT NULL THEN
    DROP TABLE public.employee_qualifications;
  END IF;
  IF to_regclass('public.employee_bank_accounts') IS NOT NULL THEN
    DROP TABLE public.employee_bank_accounts;
  END IF;
END $$;

