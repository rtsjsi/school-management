-- Ensure fee_types is removed from all environments (idempotent).
DROP TABLE IF EXISTS public.fee_types CASCADE;

