-- Module 3: Employee Master expansion
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS aadhaar VARCHAR(20),
ADD COLUMN IF NOT EXISTS pan VARCHAR(20),
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'full_time' CHECK (employee_type IN ('full_time', 'part_time', 'contract', 'temporary')),
ADD COLUMN IF NOT EXISTS joining_date DATE,
ADD COLUMN IF NOT EXISTS shift_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned', 'terminated'));

CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_shift_id ON public.employees(shift_id);

-- Employee qualifications
CREATE TABLE public.employee_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,
  institution TEXT,
  year_passed INTEGER,
  specialization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read employee_qualifications" ON public.employee_qualifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage employee_qualifications" ON public.employee_qualifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Employee bank accounts (for salary)
CREATE TABLE public.employee_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT,
  account_holder_name TEXT,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read employee_bank_accounts" ON public.employee_bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage employee_bank_accounts" ON public.employee_bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Module 4: Shift Management
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  grace_period_minutes INTEGER DEFAULT 0,
  late_threshold_minutes INTEGER DEFAULT 15,
  early_departure_threshold_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read shifts" ON public.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage shifts" ON public.shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Link employees to shifts (shift_id already on employees)
ALTER TABLE public.employees ADD CONSTRAINT fk_employees_shift
  FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;

-- Holiday calendar
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'public' CHECK (type IN ('public', 'optional', 'restricted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read holidays" ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage holidays" ON public.holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_holidays_date ON public.holidays(date);

-- Attendance punches (IN/OUT from biometric or manual)
CREATE TABLE public.attendance_punches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  punch_date DATE NOT NULL,
  punch_time TIMESTAMPTZ NOT NULL,
  punch_type TEXT NOT NULL CHECK (punch_type IN ('IN', 'OUT')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('biometric', 'manual', 'web')),
  device_id TEXT,
  is_late BOOLEAN DEFAULT false,
  is_early_departure BOOLEAN DEFAULT false,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read attendance_punches" ON public.attendance_punches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage attendance_punches" ON public.attendance_punches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_attendance_punches_employee_date ON public.attendance_punches(employee_id, punch_date);
CREATE INDEX idx_attendance_punches_date ON public.attendance_punches(punch_date);

-- Manual attendance override (for special cases)
CREATE TABLE public.attendance_manual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave', 'holiday', 'week_off')),
  in_time TIME,
  out_time TIME,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

ALTER TABLE public.attendance_manual ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read attendance_manual" ON public.attendance_manual FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage attendance_manual" ON public.attendance_manual FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_attendance_manual_employee_date ON public.attendance_manual(employee_id, attendance_date);

ANALYZE public.employees;
ANALYZE public.shifts;
ANALYZE public.holidays;
ANALYZE public.attendance_punches;
ANALYZE public.attendance_manual;
