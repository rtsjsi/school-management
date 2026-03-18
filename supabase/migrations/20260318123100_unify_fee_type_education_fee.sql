-- Unify fee_type across app: use 'education_fee' everywhere.
-- Migrates older 'tuition' data (if present) and updates defaults.

-- Update existing rows (safe to rerun; safe even if tables don't exist)
DO $$
BEGIN
  IF to_regclass('public.fees') IS NOT NULL THEN
    UPDATE public.fees SET fee_type = 'education_fee' WHERE fee_type = 'tuition';
  END IF;

  IF to_regclass('public.fee_structure_items') IS NOT NULL THEN
    UPDATE public.fee_structure_items SET fee_type = 'education_fee' WHERE fee_type = 'tuition';
  END IF;

  IF to_regclass('public.fee_collections') IS NOT NULL THEN
    UPDATE public.fee_collections SET fee_type = 'education_fee' WHERE fee_type = 'tuition';
  END IF;
END
$$;

-- Update defaults for future inserts
ALTER TABLE IF EXISTS public.fees ALTER COLUMN fee_type SET DEFAULT 'education_fee';
ALTER TABLE IF EXISTS public.fee_structure_items ALTER COLUMN fee_type SET DEFAULT 'education_fee';
ALTER TABLE IF EXISTS public.fee_collections ALTER COLUMN fee_type SET DEFAULT 'education_fee';

