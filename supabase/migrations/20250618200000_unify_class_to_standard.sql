-- Unify terminology: use "standard" everywhere. Add section to standards (from classes),
-- rename class_divisions -> standard_divisions, subjects.class_id -> standard_id, drop classes.

-- 0. standards currently has id, name, sort_order (no section). classes has section. Add and backfill.
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS section TEXT CHECK (section IN ('pre_primary', 'primary', 'secondary', 'higher_secondary'));
UPDATE public.standards s SET section = c.section FROM public.classes c WHERE c.id = s.id;
ALTER TABLE public.standards ALTER COLUMN section SET DEFAULT 'primary';
-- For any standards rows not in classes (shouldn't happen), set section
UPDATE public.standards SET section = 'primary' WHERE section IS NULL;
ALTER TABLE public.standards ALTER COLUMN section SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_standards_section ON public.standards(section);

-- 1. subjects: class_id -> standard_id (FK to standards; same ids as classes)
ALTER TABLE public.subjects RENAME COLUMN class_id TO standard_id;
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_class_id_fkey;
ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_standard_id_fkey
  FOREIGN KEY (standard_id) REFERENCES public.standards(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS public.idx_subjects_class_name;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_standard_name ON public.subjects(standard_id, name);
COMMENT ON COLUMN public.subjects.standard_id IS 'Standard (e.g. Std 1, 2) this subject belongs to';

-- 2. class_divisions -> standard_divisions, class_id -> standard_id
ALTER TABLE public.class_divisions RENAME TO standard_divisions;
ALTER TABLE public.standard_divisions RENAME COLUMN class_id TO standard_id;
ALTER TABLE public.standard_divisions DROP CONSTRAINT IF EXISTS class_divisions_class_id_fkey;
ALTER TABLE public.standard_divisions
  ADD CONSTRAINT standard_divisions_standard_id_fkey
  FOREIGN KEY (standard_id) REFERENCES public.standards(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS public.idx_class_divisions_class;
CREATE INDEX IF NOT EXISTS idx_standard_divisions_standard ON public.standard_divisions(standard_id);
ALTER TABLE public.standard_divisions DROP CONSTRAINT IF EXISTS class_divisions_class_id_name_key;
ALTER TABLE public.standard_divisions ADD CONSTRAINT standard_divisions_standard_id_name_key UNIQUE (standard_id, name);
COMMENT ON TABLE public.standard_divisions IS 'Divisions (A, B, C) under each standard';

-- RLS policies (table renamed, so policy names need recreation)
DROP POLICY IF EXISTS "Authenticated can read class_divisions" ON public.standard_divisions;
DROP POLICY IF EXISTS "Authenticated can manage class_divisions" ON public.standard_divisions;
CREATE POLICY "Authenticated can read standard_divisions"
  ON public.standard_divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage standard_divisions"
  ON public.standard_divisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Drop classes table (standards holds the same data with same ids)
DROP TABLE IF EXISTS public.classes;
