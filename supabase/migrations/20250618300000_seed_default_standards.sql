-- Insert default standards when the table is empty (e.g. after unify migration on a fresh DB).
-- Pre-primary: Nursery, Junior KG (LKG), Senior KG (UKG)
-- Primary: 1 to 8
-- Secondary: 9-10
-- Higher secondary: 11-12

INSERT INTO public.standards (name, section, sort_order)
SELECT v.name, v.section, v.sort_order
FROM (VALUES
  ('Nursery', 'pre_primary'::text, 0),
  ('Junior KG (LKG)', 'pre_primary'::text, 1),
  ('Senior KG (UKG)', 'pre_primary'::text, 2),
  ('1', 'primary'::text, 3),
  ('2', 'primary'::text, 4),
  ('3', 'primary'::text, 5),
  ('4', 'primary'::text, 6),
  ('5', 'primary'::text, 7),
  ('6', 'primary'::text, 8),
  ('7', 'primary'::text, 9),
  ('8', 'primary'::text, 10),
  ('9', 'secondary'::text, 11),
  ('10', 'secondary'::text, 12),
  ('11', 'higher_secondary'::text, 13),
  ('12', 'higher_secondary'::text, 14)
) AS v(name, section, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.standards LIMIT 1);
