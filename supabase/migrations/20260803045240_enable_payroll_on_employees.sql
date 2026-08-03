-- Flag to include/exclude an employee from payroll processing.
-- Default true so existing staff remain eligible until manually unchecked.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS enable_payroll BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.employees.enable_payroll IS
  'When false, employee is excluded from payroll attendance review, reports, and NEFT generation.';
