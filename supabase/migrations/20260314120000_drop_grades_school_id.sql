-- Remove unused school_id column from grades (multi-school plan dropped)
-- Only run if grades table exists (remote DB may have different migration history)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grades') THEN
    ALTER TABLE public.grades DROP COLUMN IF EXISTS school_id;
  END IF;
END $$;
