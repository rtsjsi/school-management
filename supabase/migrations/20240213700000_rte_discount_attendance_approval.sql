-- RTE Quota: Students under RTE have no fees
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS is_rte_quota BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_students_is_rte_quota ON public.students(is_rte_quota);
COMMENT ON COLUMN public.students.is_rte_quota IS 'RTE (Right to Education) quota - no fees for such students';

-- Fee discount: per-fee discount for special cases
ALTER TABLE public.fees
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0 CHECK (discount_amount >= 0);

COMMENT ON COLUMN public.fees.discount_percent IS 'Percentage discount on fee (0-100)';
COMMENT ON COLUMN public.fees.discount_amount IS 'Fixed amount discount on fee';

-- Attendance approval: admin must approve attendance before NEFT generation
CREATE TABLE IF NOT EXISTS public.attendance_month_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year TEXT NOT NULL UNIQUE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_month_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read attendance_month_approvals" ON public.attendance_month_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage attendance_month_approvals" ON public.attendance_month_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_attendance_month_approvals_month ON public.attendance_month_approvals(month_year);

COMMENT ON TABLE public.attendance_month_approvals IS 'Admin approval of attendance for a month - required before NEFT file generation';

-- Approved attendance snapshot: final attendance used for NEFT (after admin review/edits)
CREATE TABLE IF NOT EXISTS public.attendance_approved (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave', 'holiday', 'week_off')),
  in_time TIME,
  out_time TIME,
  working_hours NUMERIC(5, 2),
  month_year TEXT NOT NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

ALTER TABLE public.attendance_approved ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read attendance_approved" ON public.attendance_approved FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage attendance_approved" ON public.attendance_approved FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_attendance_approved_employee_date ON public.attendance_approved(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_approved_month ON public.attendance_approved(month_year);

COMMENT ON TABLE public.attendance_approved IS 'Final approved attendance used for NEFT/salary - admin reviewed and can override biometric data';

-- Employee salary for NEFT (basic structure - amount per month)
CREATE TABLE IF NOT EXISTS public.employee_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount >= 0),
  deductions NUMERIC(12, 2) DEFAULT 0 CHECK (deductions >= 0),
  net_amount NUMERIC(12, 2) NOT NULL CHECK (net_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  neft_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month_year)
);

ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read employee_salaries" ON public.employee_salaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage employee_salaries" ON public.employee_salaries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_month ON public.employee_salaries(month_year);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee ON public.employee_salaries(employee_id);

COMMENT ON TABLE public.employee_salaries IS 'Monthly salary records for employees - used for NEFT file generation';

-- Base monthly salary on employees (for salary calculation)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12, 2) CHECK (monthly_salary >= 0);

COMMENT ON COLUMN public.employees.monthly_salary IS 'Base monthly salary for NEFT/payroll';

ANALYZE public.students;
ANALYZE public.fees;
ANALYZE public.attendance_month_approvals;
ANALYZE public.attendance_approved;
ANALYZE public.employee_salaries;
