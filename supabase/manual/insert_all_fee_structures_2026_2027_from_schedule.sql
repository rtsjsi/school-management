-- Fee structures for academic year 2026-2027 — from printed "Fees Structure- 2026:27"
-- Sets total_fees (FRC) and education_fee per quarter (Q1–Q4).
--
-- DB standard names must match `standards.name` (Nursery, Junior KG (LKG), I, II, … XII).
-- XI/XII use stream "Science" on the sheet; mapped to standards XI / XII.
--
-- Safe to re-run: replaces fee_structure + items for each standard for 2026-2027 only.
-- If your app uses a different academic_year label, replace '2026-2027' below.

BEGIN;

-- Nursery — FRC 19,610
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'Nursery' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 19610::numeric FROM public.standards WHERE name = 'Nursery' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'Nursery'
CROSS JOIN (VALUES (1, 4903::numeric), (2, 4903), (3, 4903), (4, 4903)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- Jr. KG — FRC 32,860
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'Junior KG (LKG)' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'Junior KG (LKG)' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 32860::numeric FROM public.standards WHERE name = 'Junior KG (LKG)' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'Junior KG (LKG)'
CROSS JOIN (VALUES (1, 8215::numeric), (2, 8215), (3, 8215), (4, 8215)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- Sr. KG — FRC 32,860
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'Senior KG (UKG)' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'Senior KG (UKG)' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 32860::numeric FROM public.standards WHERE name = 'Senior KG (UKG)' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'Senior KG (UKG)'
CROSS JOIN (VALUES (1, 8215::numeric), (2, 8215), (3, 8215), (4, 8215)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- I — FRC 34,300
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'I' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'I' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 34300::numeric FROM public.standards WHERE name = 'I' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'I'
CROSS JOIN (VALUES (1, 8575::numeric), (2, 8575), (3, 8575), (4, 8575)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- II
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'II' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'II' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 34300::numeric FROM public.standards WHERE name = 'II' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'II'
CROSS JOIN (VALUES (1, 8575::numeric), (2, 8575), (3, 8575), (4, 8575)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- III — FRC 35,080
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'III' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'III' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 35080::numeric FROM public.standards WHERE name = 'III' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'III'
CROSS JOIN (VALUES (1, 8770::numeric), (2, 8770), (3, 8770), (4, 8770)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- IV
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'IV' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'IV' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 35080::numeric FROM public.standards WHERE name = 'IV' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'IV'
CROSS JOIN (VALUES (1, 8770::numeric), (2, 8770), (3, 8770), (4, 8770)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- V
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'V' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'V' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 35080::numeric FROM public.standards WHERE name = 'V' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'V'
CROSS JOIN (VALUES (1, 8770::numeric), (2, 8770), (3, 8770), (4, 8770)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- VI — FRC 39,680
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'VI' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'VI' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 39680::numeric FROM public.standards WHERE name = 'VI' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'VI'
CROSS JOIN (VALUES (1, 9920::numeric), (2, 9920), (3, 9920), (4, 9920)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- VII
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'VII' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'VII' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 39680::numeric FROM public.standards WHERE name = 'VII' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'VII'
CROSS JOIN (VALUES (1, 9920::numeric), (2, 9920), (3, 9920), (4, 9920)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- VIII — FRC 41,500
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'VIII' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'VIII' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 41500::numeric FROM public.standards WHERE name = 'VIII' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'VIII'
CROSS JOIN (VALUES (1, 10375::numeric), (2, 10375), (3, 10375), (4, 10375)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- IX — FRC 45,850 (quarters per sheet; 4×11,463 = 45,852)
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'IX' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'IX' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 45850::numeric FROM public.standards WHERE name = 'IX' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'IX'
CROSS JOIN (VALUES (1, 11463::numeric), (2, 11463), (3, 11463), (4, 11463)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- X — FRC 52,460
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'X' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'X' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 52460::numeric FROM public.standards WHERE name = 'X' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'X'
CROSS JOIN (VALUES (1, 13115::numeric), (2, 13115), (3, 13115), (4, 13115)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- XI Science → standard XI — FRC 60,000
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'XI' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'XI' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 60000::numeric FROM public.standards WHERE name = 'XI' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'XI'
CROSS JOIN (VALUES (1, 15000::numeric), (2, 15000), (3, 15000), (4, 15000)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

-- XII Science → standard XII — FRC 60,000
DELETE FROM public.fee_structure_items WHERE fee_structure_id IN (
  SELECT fs.id FROM public.fee_structures fs JOIN public.standards st ON st.id = fs.standard_id
  WHERE st.name = 'XII' AND fs.academic_year = '2026-2027');
DELETE FROM public.fee_structures WHERE standard_id = (SELECT id FROM public.standards WHERE name = 'XII' LIMIT 1) AND academic_year = '2026-2027';
INSERT INTO public.fee_structures (standard_id, academic_year, total_fees)
SELECT id, '2026-2027', 60000::numeric FROM public.standards WHERE name = 'XII' LIMIT 1;
INSERT INTO public.fee_structure_items (fee_structure_id, fee_type, quarter, amount)
SELECT fs.id, 'education_fee', v.q, v.amt FROM public.fee_structures fs
JOIN public.standards st ON st.id = fs.standard_id AND st.name = 'XII'
CROSS JOIN (VALUES (1, 15000::numeric), (2, 15000), (3, 15000), (4, 15000)) AS v(q, amt)
WHERE fs.academic_year = '2026-2027';

COMMIT;
