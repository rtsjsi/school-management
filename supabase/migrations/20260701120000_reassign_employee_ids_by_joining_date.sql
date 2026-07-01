-- Reassign employee_id to sequential numbers (1, 2, 3…) ordered by joining date.
-- Two-step update avoids unique-constraint collisions during reassignment.

UPDATE public.employees
SET employee_id = 'TMP-' || id::text
WHERE employee_id IS NOT NULL OR employee_id IS NULL;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY joining_date ASC NULLS LAST, created_at ASC NULLS LAST, full_name ASC
    ) AS seq
  FROM public.employees
)
UPDATE public.employees e
SET employee_id = ranked.seq::text
FROM ranked
WHERE e.id = ranked.id;
