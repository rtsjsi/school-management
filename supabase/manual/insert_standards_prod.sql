-- Insert canonical Standards for production/dev.
-- Assumes you are inserting fresh data (table flushed or empty).
-- Run (from repo root) with:
--   node scripts/by-branch.js db query --linked -f supabase/manual/insert_standards_prod.sql -o table

INSERT INTO public.standards (name, section, sort_order)
VALUES
  ('Nursery', 'pre_primary', 0),
  ('Junior KG (LKG)', 'pre_primary', 1),
  ('Senior KG (UKG)', 'pre_primary', 2),
  ('I', 'primary', 3),
  ('II', 'primary', 4),
  ('III', 'primary', 5),
  ('IV', 'primary', 6),
  ('V', 'primary', 7),
  ('VI', 'primary', 8),
  ('VII', 'primary', 9),
  ('VIII', 'primary', 10),
  ('IX', 'secondary', 11),
  ('X', 'secondary', 12),
  ('XI', 'higher_secondary', 13),
  ('XII', 'higher_secondary', 14);

