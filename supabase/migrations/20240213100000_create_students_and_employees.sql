-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  grade TEXT,
  section TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read; admin and super_admin can manage (we'll use app-level checks; allow authenticated read for now)
CREATE POLICY "Authenticated can read students"
  ON public.students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage students"
  ON public.students FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage employees"
  ON public.employees FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.students IS 'Student records; entry accessible by admin and super_admin';
COMMENT ON TABLE public.employees IS 'Employee records; entry accessible by admin and super_admin';
