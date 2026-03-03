-- Rename Fee mafi to Fee Concession in students table; remove all_fee_mafi checkbox column.

ALTER TABLE public.students
  RENAME COLUMN fee_mafi_amount TO fee_concession_amount;

ALTER TABLE public.students
  RENAME COLUMN fee_mafi_reason TO fee_concession_reason;

ALTER TABLE public.students
  DROP COLUMN IF EXISTS all_fee_mafi;

COMMENT ON COLUMN public.students.fee_concession_amount IS 'Fee concession amount in Rs';
COMMENT ON COLUMN public.students.fee_concession_reason IS 'Reason for fee concession';
