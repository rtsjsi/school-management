-- Rename English Language to English -1 for Class I and II
UPDATE subjects 
SET name = 'English -1' 
WHERE name = 'English Language' AND standard_id IN ('549ef784-e4cd-4e4d-a050-77eea89d37a2', 'b976c5a2-4923-4b1c-857a-d6c373263ad3');

-- Rename English Literature to English -2 for Class I and II
UPDATE subjects 
SET name = 'English -2' 
WHERE name = 'English Literature' AND standard_id IN ('549ef784-e4cd-4e4d-a050-77eea89d37a2', 'b976c5a2-4923-4b1c-857a-d6c373263ad3');

-- Rename Conduct to Discipline for Class I and II
UPDATE subjects 
SET name = 'Discipline' 
WHERE name = 'Conduct' AND standard_id IN ('549ef784-e4cd-4e4d-a050-77eea89d37a2', 'b976c5a2-4923-4b1c-857a-d6c373263ad3');

-- Delete Life Values for Class I and II
DELETE FROM subjects 
WHERE name = 'Life Values' AND standard_id IN ('549ef784-e4cd-4e4d-a050-77eea89d37a2', 'b976c5a2-4923-4b1c-857a-d6c373263ad3');
