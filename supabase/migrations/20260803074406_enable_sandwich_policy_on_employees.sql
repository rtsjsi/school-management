-- Per-employee sandwich leave policy (Fri/Mon leave → Saturday salary deduction).
-- Default true so existing staff keep current payroll behavior until unchecked.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS enable_sandwich_policy BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.employees.enable_sandwich_policy IS
  'When false, Fri/Mon sandwich Saturday salary deductions are not applied for this employee.';
