-- Student attendance totals for each term of an academic year.
-- Working days are stored on every student row so a class can be saved in one upsert.

CREATE TABLE IF NOT EXISTS public.student_term_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  term text NOT NULL CHECK (term IN ('Term-1', 'Term-2')),
  working_days integer CHECK (working_days IS NULL OR working_days >= 0),
  present_days integer CHECK (present_days IS NULL OR present_days >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT student_term_attendance_student_year_term_key UNIQUE (student_id, academic_year_id, term),
  CONSTRAINT student_term_attendance_present_lte_working CHECK (
    present_days IS NULL OR working_days IS NULL OR present_days <= working_days
  )
);

CREATE INDEX IF NOT EXISTS student_term_attendance_year_term_idx
  ON public.student_term_attendance (academic_year_id, term);

ALTER TABLE public.student_term_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read student_term_attendance" ON public.student_term_attendance;
CREATE POLICY "Authenticated can read student_term_attendance"
  ON public.student_term_attendance FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can manage student_term_attendance" ON public.student_term_attendance;
CREATE POLICY "Authenticated can manage student_term_attendance"
  ON public.student_term_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.student_term_attendance TO authenticated, anon, service_role;
