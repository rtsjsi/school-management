-- Seed standard divisions and divisions according to desired structure.
-- Pre-primary: Nursery, Junior KG (LKG), Senior KG (UKG) -> A
-- Primary: 1-8 -> A, B
-- Secondary: 9-10 -> A
-- Higher secondary: 11-12 -> A

WITH cfg AS (
  SELECT * FROM (VALUES
    ('Nursery'::text, 'A'::text, 0),
    ('Junior KG (LKG)', 'A', 0),
    ('Senior KG (UKG)', 'A', 0),
    ('1', 'A', 0),
    ('1', 'B', 1),
    ('2', 'A', 0),
    ('2', 'B', 1),
    ('3', 'A', 0),
    ('3', 'B', 1),
    ('4', 'A', 0),
    ('4', 'B', 1),
    ('5', 'A', 0),
    ('5', 'B', 1),
    ('6', 'A', 0),
    ('6', 'B', 1),
    ('7', 'A', 0),
    ('7', 'B', 1),
    ('8', 'A', 0),
    ('8', 'B', 1),
    ('9', 'A', 0),
    ('10', 'A', 0),
    ('11', 'A', 0),
    ('12', 'A', 0)
  ) AS t(standard_name, division_name, sort_order)
)
INSERT INTO public.standard_divisions (standard_id, name, sort_order)
SELECT s.id, c.division_name, c.sort_order
FROM cfg c
JOIN public.standards s ON s.name = c.standard_name
ON CONFLICT (standard_id, name) DO NOTHING;

-- Mirror into divisions table (used by enrollments and other features)
INSERT INTO public.divisions (name, standard_id, sort_order)
SELECT sd.name, sd.standard_id, sd.sort_order
FROM public.standard_divisions sd
LEFT JOIN public.divisions d
  ON d.standard_id = sd.standard_id AND d.name = sd.name
WHERE d.id IS NULL;

