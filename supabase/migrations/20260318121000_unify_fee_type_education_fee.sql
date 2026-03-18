-- Unify fee_type across app: use 'education_fee' everywhere.
-- This keeps frontend/back-end consistent and migrates older 'tuition' data.

-- Update existing rows
UPDATE public.fees SET fee_type = 'education_fee' WHERE fee_type = 'tuition';
UPDATE public.fee_structure_items SET fee_type = 'education_fee' WHERE fee_type = 'tuition';
UPDATE public.fee_collections SET fee_type = 'education_fee' WHERE fee_type = 'tuition';

-- Update defaults for future inserts
ALTER TABLE public.fees ALTER COLUMN fee_type SET DEFAULT 'education_fee';
ALTER TABLE public.fee_structure_items ALTER COLUMN fee_type SET DEFAULT 'education_fee';
ALTER TABLE public.fee_collections ALTER COLUMN fee_type SET DEFAULT 'education_fee';

