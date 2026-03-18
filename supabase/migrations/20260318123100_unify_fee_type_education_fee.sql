-- Unify fee_type across app: use 'education_fee' everywhere.
-- Migrates older 'tuition' data (if present) and updates defaults.

-- Update existing rows (safe to rerun)
UPDATE public.fees SET fee_type = 'education_fee' WHERE fee_type = 'tuition';
UPDATE public.fee_structure_items SET fee_type = 'education_fee' WHERE fee_type = 'tuition';
UPDATE public.fee_collections SET fee_type = 'education_fee' WHERE fee_type = 'tuition';

-- Update defaults for future inserts
ALTER TABLE public.fees ALTER COLUMN fee_type SET DEFAULT 'education_fee';
ALTER TABLE public.fee_structure_items ALTER COLUMN fee_type SET DEFAULT 'education_fee';
ALTER TABLE public.fee_collections ALTER COLUMN fee_type SET DEFAULT 'education_fee';

