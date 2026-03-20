-- Nursery fee structure — "Fees Structure- 2026:27" (printed schedule)
-- Final FRC: 19,610 | Quarter 1–4: 4,903 each (education_fee)
--
-- Academic year is stored as text on fee_structures. This uses '2026-2027'.
-- If your school uses another label (e.g. '2026-27'), change both occurrences below.
--
-- Safe to re-run: replaces items for Nursery + this academic year only.

BEGIN;

DELETE FROM public.fee_structure_items
WHERE fee_structure_id IN (
  SELECT fs.id
  FROM public.fee_structures fs
  JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'Nursery' AND fs.academic_year = '2026-2027'
);

DELETE FROM public.fee_structures
WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1)
  AND academic_year = '2026-2027';

INSERT INTO public.fee_structures (standard_id, academic_year)
SELECT id, '2026-2027' FROM public.standards WHERE name = 'Nursery' LIMIT 1;

INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt
FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'Nursery'
CROSS JOIN (VALUES
  (1, 4903::numeric),
  (2, 4903::numeric),
  (3, 4903::numeric),
  (4, 4903::numeric)
) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

COMMIT;
