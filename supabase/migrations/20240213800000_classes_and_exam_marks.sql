-- Classes: Pre-primary, Primary, Secondary, Higher Secondary
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL CHECK (section IN ('pre_primary', 'primary', 'secondary', 'higher_secondary')),
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage classes" ON public.classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_classes_section ON public.classes(section);

COMMENT ON TABLE public.classes IS 'Class definitions: Jr KG, Sr KG (pre_primary), 1-8 (primary), 9-10 (secondary), 11-12 (higher_secondary)';

-- Add grade column to students to reference class name (students.grade already exists as TEXT)
-- No schema change needed; classes are for reference and fee structure matching

ANALYZE public.classes;
