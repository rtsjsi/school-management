-- Update standard names 1-12 to Roman numerals (I–XII).
-- Safe to run multiple times.

UPDATE public.standards SET name = 'I'   WHERE name = '1';
UPDATE public.standards SET name = 'II'  WHERE name = '2';
UPDATE public.standards SET name = 'III' WHERE name = '3';
UPDATE public.standards SET name = 'IV'  WHERE name = '4';
UPDATE public.standards SET name = 'V'   WHERE name = '5';
UPDATE public.standards SET name = 'VI'  WHERE name = '6';
UPDATE public.standards SET name = 'VII' WHERE name = '7';
UPDATE public.standards SET name = 'VIII' WHERE name = '8';
UPDATE public.standards SET name = 'IX'  WHERE name = '9';
UPDATE public.standards SET name = 'X'   WHERE name = '10';
UPDATE public.standards SET name = 'XI'  WHERE name = '11';
UPDATE public.standards SET name = 'XII' WHERE name = '12';

