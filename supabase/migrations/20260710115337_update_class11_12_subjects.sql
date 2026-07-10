-- Rename English Language to English -1
UPDATE subjects SET name = 'English -1' WHERE name = 'English Language' AND standard_id IN ('ffbd328a-60c1-49d7-8b8d-c007cd17225d', 'fd6fec35-b4e4-4fd9-8953-8f89507fd4c9');

-- Rename English Literature to English -2
UPDATE subjects SET name = 'English -2' WHERE name = 'English Literature' AND standard_id IN ('ffbd328a-60c1-49d7-8b8d-c007cd17225d', 'fd6fec35-b4e4-4fd9-8953-8f89507fd4c9');

-- Rename Conduct to Discipline
UPDATE subjects SET name = 'Discipline' WHERE name = 'Conduct' AND standard_id IN ('ffbd328a-60c1-49d7-8b8d-c007cd17225d', 'fd6fec35-b4e4-4fd9-8953-8f89507fd4c9');

-- Delete Life Values
DELETE FROM subjects WHERE name = 'Life Values' AND standard_id IN ('ffbd328a-60c1-49d7-8b8d-c007cd17225d', 'fd6fec35-b4e4-4fd9-8953-8f89507fd4c9');

-- Insert PT based on SUPW row
INSERT INTO subjects (name, code, sort_order, standard_id, evaluation_type)
SELECT 'PT', code, sort_order + 1, standard_id, evaluation_type
FROM subjects 
WHERE name = 'SUPW' AND standard_id IN ('ffbd328a-60c1-49d7-8b8d-c007cd17225d', 'fd6fec35-b4e4-4fd9-8953-8f89507fd4c9');
