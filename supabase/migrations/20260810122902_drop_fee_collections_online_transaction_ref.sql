-- Unused optional field; app now only stores online_transaction_id for online payments.
ALTER TABLE public.fee_collections
  DROP COLUMN IF EXISTS online_transaction_ref;
