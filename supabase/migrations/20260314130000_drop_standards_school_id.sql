-- Remove unused school_id column from standards (multi-school plan dropped)
-- standards was renamed from grades which had school_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'standards') THEN
    ALTER TABLE public.standards DROP COLUMN IF EXISTS school_id;
  END IF;
END $$;
