-- Grades table (enrollment model); backfill from classes so grade_id = class_id for migration
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grades_sort ON public.grades(sort_order);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read grades"
  ON public.grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage grades"
  ON public.grades FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.grades IS 'Grade levels (e.g. Grade 1, 2); sort_order defines next grade and graduating grade';

-- Backfill from classes (reuse class id so divisions can use grade_id = class_id)
INSERT INTO public.grades (id, name, sort_order)
SELECT id, name, sort_order FROM public.classes
ON CONFLICT (id) DO NOTHING;
