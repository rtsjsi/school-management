-- Rename English Language to English -1
UPDATE subjects SET name = 'English -1' WHERE name = 'English Language' AND standard_id IN ('ac8f80a4-3aa0-4f45-b6c1-35732fcf44fb', '35819bde-ac2d-4963-8305-5885da78d810');

-- Rename English Literature to English -2
UPDATE subjects SET name = 'English -2' WHERE name = 'English Literature' AND standard_id IN ('ac8f80a4-3aa0-4f45-b6c1-35732fcf44fb', '35819bde-ac2d-4963-8305-5885da78d810');

-- Rename Hindi/Gujarati to Second Language
UPDATE subjects SET name = 'Second Language' WHERE name = 'Hindi/Gujarati' AND standard_id IN ('ac8f80a4-3aa0-4f45-b6c1-35732fcf44fb', '35819bde-ac2d-4963-8305-5885da78d810');

-- Rename Economic Applications to Economic Application
UPDATE subjects SET name = 'Economic Application' WHERE name = 'Economic Applications' AND standard_id IN ('ac8f80a4-3aa0-4f45-b6c1-35732fcf44fb', '35819bde-ac2d-4963-8305-5885da78d810');

-- Rename Conduct to Discipline
UPDATE subjects SET name = 'Discipline' WHERE name = 'Conduct' AND standard_id IN ('ac8f80a4-3aa0-4f45-b6c1-35732fcf44fb', '35819bde-ac2d-4963-8305-5885da78d810');

-- Delete missing subjects
DELETE FROM subjects WHERE name IN ('Life Values', 'Computer (Co-scholastic)', 'Computer', 'GK', 'Spelling', 'Handwriting') AND standard_id IN ('ac8f80a4-3aa0-4f45-b6c1-35732fcf44fb', '35819bde-ac2d-4963-8305-5885da78d810');
