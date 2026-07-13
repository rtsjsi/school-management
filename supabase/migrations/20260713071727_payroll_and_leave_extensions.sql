CREATE TABLE IF NOT EXISTS public.employee_salary_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    effective_from_date DATE NOT NULL,
    basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    child_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    pf_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employee_salary_history_employee_id ON public.employee_salary_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_history_effective_from_date ON public.employee_salary_history(effective_from_date);

CREATE TABLE IF NOT EXISTS public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- e.g. "2026-09"
    present_days NUMERIC(5, 2) NOT NULL DEFAULT 0,
    basic_salary_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
    allowance_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
    child_allowance_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
    pf_deduction_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_month ON public.payslips(employee_id, month_year);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payslips_employee_month ON public.payslips(employee_id, month_year);

CREATE TABLE IF NOT EXISTS public.employee_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL, -- e.g. "2026-2027"
    leave_type TEXT NOT NULL,
    allocated_days NUMERIC(5, 2) NOT NULL DEFAULT 0,
    used_days NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_leave_balances_emp_year_type ON public.employee_leave_balances(employee_id, academic_year, leave_type);
CREATE INDEX IF NOT EXISTS idx_employee_leave_balances_employee_id ON public.employee_leave_balances(employee_id);

-- RLS Policies
ALTER TABLE public.employee_salary_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leave_balances ENABLE ROW LEVEL SECURITY;

-- Admins and Payroll can manage salary history
CREATE POLICY "Admins and payroll can manage salary history" ON public.employee_salary_history
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('admin', 'principal', 'payroll')
    )
    WITH CHECK (
        (auth.jwt() ->> 'role') IN ('admin', 'principal', 'payroll')
    );

CREATE POLICY "Admins and payroll can manage payslips" ON public.payslips
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('admin', 'principal', 'payroll')
    )
    WITH CHECK (
        (auth.jwt() ->> 'role') IN ('admin', 'principal', 'payroll')
    );

CREATE POLICY "Admins and payroll can manage leave balances" ON public.employee_leave_balances
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('admin', 'principal', 'payroll')
    )
    WITH CHECK (
        (auth.jwt() ->> 'role') IN ('admin', 'principal', 'payroll')
    );

-- Populate employee_salary_history for existing employees (with current monthly_salary acting as basic)
INSERT INTO public.employee_salary_history (employee_id, effective_from_date, basic_salary, allowance, child_allowance, pf_deduction)
SELECT id, COALESCE(joining_date, '2000-01-01'), COALESCE(monthly_salary, 0), 0, 0, 0
FROM public.employees
ON CONFLICT DO NOTHING;

-- Populate employee_leave_balances for existing employees (allocate 5 days of casual_leave for current academic year)
-- Let's use '2026-2027' as a default academic year for this migration
INSERT INTO public.employee_leave_balances (employee_id, academic_year, leave_type, allocated_days, used_days)
SELECT id, '2026-2027', 'casual_leave', 5, 0
FROM public.employees
ON CONFLICT (employee_id, academic_year, leave_type) DO NOTHING;
