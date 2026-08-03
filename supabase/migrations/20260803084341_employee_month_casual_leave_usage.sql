-- Track casual leave days applied against sandwich/late deductions per employee/month
-- so re-finalize can adjust balances without double-counting.

CREATE TABLE IF NOT EXISTS public.employee_month_casual_leave_usage (
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  days_used NUMERIC(5, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, month_year)
);

CREATE INDEX IF NOT EXISTS employee_month_casual_leave_usage_month_idx
  ON public.employee_month_casual_leave_usage (month_year);

ALTER TABLE public.employee_month_casual_leave_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_employee_month_casual_leave_usage"
  ON public.employee_month_casual_leave_usage;
CREATE POLICY "authenticated_select_employee_month_casual_leave_usage"
  ON public.employee_month_casual_leave_usage
  FOR SELECT TO authenticated
  USING (true);
