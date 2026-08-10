-- Speed up app-level duplicate checks for online_transaction_id.
-- Non-unique by design: existing shared IDs remain valid; uniqueness is enforced in the app.
CREATE INDEX IF NOT EXISTS fee_collections_online_transaction_id_idx
  ON public.fee_collections (online_transaction_id)
  WHERE online_transaction_id IS NOT NULL AND btrim(online_transaction_id) <> '';
