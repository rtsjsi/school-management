-- Store salary and casual leave directly on employees (replace history / leave-balance tables).

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS other_allowance NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS child_allowance NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS casual_leave_balance NUMERIC(5, 2);

DO $$
BEGIN
  IF to_regclass('public.employee_salary_history') IS NOT NULL THEN
    UPDATE public.employees e
    SET
      basic_salary = COALESCE(
        (
          SELECT h.basic_salary
          FROM public.employee_salary_history h
          WHERE h.employee_id = e.id
          ORDER BY h.effective_from_date DESC
          LIMIT 1
        ),
        e.monthly_salary,
        0
      ),
      other_allowance = COALESCE(
        (
          SELECT h.allowance
          FROM public.employee_salary_history h
          WHERE h.employee_id = e.id
          ORDER BY h.effective_from_date DESC
          LIMIT 1
        ),
        0
      ),
      child_allowance = COALESCE(
        (
          SELECT h.child_allowance
          FROM public.employee_salary_history h
          WHERE h.employee_id = e.id
          ORDER BY h.effective_from_date DESC
          LIMIT 1
        ),
        0
      )
    WHERE e.basic_salary IS NULL
       OR e.other_allowance IS NULL
       OR e.child_allowance IS NULL;
  ELSE
    UPDATE public.employees
    SET
      basic_salary = COALESCE(basic_salary, monthly_salary, 0),
      other_allowance = COALESCE(other_allowance, 0),
      child_allowance = COALESCE(child_allowance, 0)
    WHERE basic_salary IS NULL
       OR other_allowance IS NULL
       OR child_allowance IS NULL;
  END IF;

  IF to_regclass('public.employee_leave_balances') IS NOT NULL THEN
    UPDATE public.employees e
    SET casual_leave_balance = COALESCE(
      (
        SELECT GREATEST(0, COALESCE(b.allocated_days, 0) - COALESCE(b.used_days, 0))
        FROM public.employee_leave_balances b
        WHERE b.employee_id = e.id
          AND b.leave_type = 'casual_leave'
        ORDER BY b.academic_year DESC
        LIMIT 1
      ),
      5
    )
    WHERE e.casual_leave_balance IS NULL;
  ELSE
    UPDATE public.employees
    SET casual_leave_balance = COALESCE(casual_leave_balance, 5)
    WHERE casual_leave_balance IS NULL;
  END IF;
END $$;

UPDATE public.employees
SET
  basic_salary = COALESCE(basic_salary, 0),
  other_allowance = COALESCE(other_allowance, 0),
  child_allowance = COALESCE(child_allowance, 0),
  casual_leave_balance = COALESCE(casual_leave_balance, 5),
  monthly_salary = COALESCE(basic_salary, 0) + COALESCE(other_allowance, 0) + COALESCE(child_allowance, 0);

ALTER TABLE public.employees
  ALTER COLUMN basic_salary SET DEFAULT 0,
  ALTER COLUMN other_allowance SET DEFAULT 0,
  ALTER COLUMN child_allowance SET DEFAULT 0,
  ALTER COLUMN casual_leave_balance SET DEFAULT 5;

DROP TABLE IF EXISTS public.employee_salary_history CASCADE;
DROP TABLE IF EXISTS public.employee_leave_balances CASCADE;
DROP TABLE IF EXISTS public.payslips CASCADE;
