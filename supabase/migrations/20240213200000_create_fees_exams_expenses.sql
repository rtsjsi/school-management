-- Fees: student fee records and payment status
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  fee_type TEXT NOT NULL DEFAULT 'tuition',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read fees"
  ON public.fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage fees"
  ON public.fees FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_fees_student_id ON public.fees(student_id);
CREATE INDEX idx_fees_status ON public.fees(status);
CREATE INDEX idx_fees_due_date ON public.fees(due_date);

COMMENT ON TABLE public.fees IS 'Student fee records; fee_type e.g. tuition, transport';

-- Exams: exam definitions and schedules
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'final' CHECK (exam_type IN ('midterm', 'final', 'quiz', 'assignment')),
  subject TEXT,
  grade TEXT,
  held_at DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read exams"
  ON public.exams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage exams"
  ON public.exams FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_exams_held_at ON public.exams(held_at);
CREATE INDEX idx_exams_exam_type ON public.exams(exam_type);

COMMENT ON TABLE public.exams IS 'Exam schedules and metadata';

-- Exam results: link student to exam with score (optional, for later use)
CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC(5, 2),
  max_score NUMERIC(5, 2),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read exam_results"
  ON public.exam_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage exam_results"
  ON public.exam_results FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_exam_results_exam_id ON public.exam_results(exam_id);
CREATE INDEX idx_exam_results_student_id ON public.exam_results(student_id);

COMMENT ON TABLE public.exam_results IS 'Student scores per exam';

-- Expenses: school expense records
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('salary', 'utilities', 'supplies', 'maintenance', 'transport', 'other')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage expenses"
  ON public.expenses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);

COMMENT ON TABLE public.expenses IS 'School expense records by category';
