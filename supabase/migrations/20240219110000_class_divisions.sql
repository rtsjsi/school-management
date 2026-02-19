-- Divisions under each class (e.g. A, B, C for class 10)
CREATE TABLE IF NOT EXISTS public.class_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, name)
);

CREATE INDEX IF NOT EXISTS idx_class_divisions_class ON public.class_divisions(class_id);
ALTER TABLE public.class_divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read class_divisions"
  ON public.class_divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage class_divisions"
  ON public.class_divisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.class_divisions IS 'Divisions (A, B, C) under each class';
