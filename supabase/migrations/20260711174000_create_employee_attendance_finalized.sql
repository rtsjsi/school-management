CREATE TABLE public.employee_attendance_finalized (
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    month_year VARCHAR(7) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave', 'holiday', 'week_off')),
    is_manual_override BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (employee_id, attendance_date)
);

ALTER TABLE public.employee_attendance_finalized ENABLE ROW LEVEL SECURITY;
