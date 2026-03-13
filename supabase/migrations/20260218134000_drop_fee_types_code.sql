-- Remove unused 'code' column from fee_types.

ALTER TABLE public.fee_types
  DROP COLUMN IF EXISTS code;

