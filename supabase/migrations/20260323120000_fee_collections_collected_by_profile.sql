-- fee_collections.collected_by: store profiles.id (UUID) instead of free-text name/email
-- Add modified_by for last editor from the fee collection edit form

ALTER TABLE public.fee_collections
  ADD COLUMN IF NOT EXISTS collected_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill from legacy TEXT column (name / email / UUID string) before drop
UPDATE public.fee_collections fc
SET collected_by_profile_id = (
  SELECT p.id
  FROM public.profiles p
  WHERE fc.collected_by IS NOT NULL
    AND (
      p.id::text = trim(fc.collected_by)
      OR lower(trim(COALESCE(p.email, ''))) = lower(trim(fc.collected_by))
      OR lower(trim(COALESCE(p.full_name, ''))) = lower(trim(fc.collected_by))
    )
  ORDER BY p.id
  LIMIT 1
)
WHERE fc.collected_by IS NOT NULL;

ALTER TABLE public.fee_collections DROP COLUMN IF EXISTS collected_by;

ALTER TABLE public.fee_collections RENAME COLUMN collected_by_profile_id TO collected_by;

COMMENT ON COLUMN public.fee_collections.collected_by IS 'User profile id (profiles.id) of staff who collected the fee';

ALTER TABLE public.fee_collections
  ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.fee_collections.modified_by IS 'User profile id of staff who last edited this row from the fee collection form';

CREATE INDEX IF NOT EXISTS idx_fee_collections_collected_by ON public.fee_collections(collected_by);
CREATE INDEX IF NOT EXISTS idx_fee_collections_modified_by ON public.fee_collections(modified_by);

-- Allow authenticated users to read full_name for profiles referenced as collector or modifier on fee_collections
-- (needed for receipts/reports when the collector is not the current user)
DROP POLICY IF EXISTS "Authenticated can read collector or modifier profiles" ON public.profiles;
CREATE POLICY "Authenticated can read collector or modifier profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fee_collections fc
      WHERE fc.collected_by = profiles.id OR fc.modified_by = profiles.id
    )
  );
