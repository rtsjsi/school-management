-- Insert Standard Divisions for production/dev.
-- Assumes:
--   - public.standards already contains Nursery, Junior KG (LKG), Senior KG (UKG), I–X, and XI Science / XII Science.
--   - You are inserting fresh data (standard_divisions flushed/empty or safe to duplicate-check externally).
-- Run (from repo root) with:
--   node scripts/by-branch.js db query --linked -f supabase/manual/insert_standard_divisions_prod.sql -o table

-- A for Nursery, Junior KG, Senior KG
INSERT INTO public.standard_divisions (standard_id, name, sort_order)
SELECT s.id, 'A', 0
FROM public.standards s
WHERE s.name IN ('Nursery', 'Junior KG (LKG)', 'Senior KG (UKG)');

-- A and B for I to V
INSERT INTO public.standard_divisions (standard_id, name, sort_order)
SELECT s.id, d.name, d.sort_order
FROM public.standards s
JOIN (VALUES ('A'::text, 0), ('B'::text, 1)) AS d(name, sort_order)
  ON TRUE
WHERE s.name IN ('I', 'II', 'III', 'IV', 'V');

-- A for VI to XII Science
INSERT INTO public.standard_divisions (standard_id, name, sort_order)
SELECT s.id, 'A', 0
FROM public.standards s
WHERE s.name IN ('VI', 'VII', 'VIII', 'IX', 'X', 'XI Science', 'XII Science');

