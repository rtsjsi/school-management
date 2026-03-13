-- Ensure only one fee structure per (standard_id, academic_year).
-- First, clean up any duplicates by keeping the lowest-id row per (standard_id, academic_year).

WITH ranked AS (
  SELECT
    id,
    standard_id,
    academic_year,
    ROW_NUMBER() OVER (PARTITION BY standard_id, academic_year ORDER BY id) AS rn
  FROM public.fee_structures
)
DELETE FROM public.fee_structures fs
USING ranked r
WHERE fs.id = r.id
  AND r.rn > 1;

ALTER TABLE public.fee_structures
  ADD CONSTRAINT fee_structures_standard_year_unique
  UNIQUE (standard_id, academic_year);

