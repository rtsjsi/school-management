-- Divisions table (enrollment model); backfill from class_divisions
-- class_divisions.class_id maps to grades.id (same id after grades backfill)
CREATE TABLE IF NOT EXISTS public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(grade_id, name)
);

CREATE INDEX IF NOT EXISTS idx_divisions_grade ON public.divisions(grade_id);
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read divisions"
  ON public.divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage divisions"
  ON public.divisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.divisions IS 'Divisions (A, B, C) per grade';

-- Backfill from class_divisions (class_id = grade_id after grades backfill from classes)
INSERT INTO public.divisions (id, name, grade_id, sort_order)
SELECT cd.id, cd.name, cd.class_id, cd.sort_order
FROM public.class_divisions cd
WHERE EXISTS (SELECT 1 FROM public.grades g WHERE g.id = cd.class_id)
ON CONFLICT (id) DO NOTHING;
