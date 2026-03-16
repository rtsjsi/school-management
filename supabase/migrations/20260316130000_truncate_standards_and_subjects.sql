-- One-time flush of standards and subjects master data.
-- This migration exists because earlier data-flush logic had already run
-- before standards/subjects truncation was added.

DO $$
BEGIN
  -- Only run if this version is not already recorded in schema_migrations
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260316121000'
  ) THEN
    TRUNCATE TABLE public.subjects  RESTART IDENTITY CASCADE;
    TRUNCATE TABLE public.standards RESTART IDENTITY CASCADE;
  END IF;
END $$;


