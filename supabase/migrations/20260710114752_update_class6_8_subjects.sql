-- Rename English Language to English -1
UPDATE subjects SET name = 'English -1' WHERE name = 'English Language' AND standard_id IN ('f7a9522b-1d2d-42c3-858c-4b0757ab7435', 'c0e1b5b4-0e7f-4120-96c0-c5dcbe7bb02c', '6c77527e-a193-49a4-b7c1-2a1a0832a035');

-- Rename English Literature to English -2
UPDATE subjects SET name = 'English -2' WHERE name = 'English Literature' AND standard_id IN ('f7a9522b-1d2d-42c3-858c-4b0757ab7435', 'c0e1b5b4-0e7f-4120-96c0-c5dcbe7bb02c', '6c77527e-a193-49a4-b7c1-2a1a0832a035');

-- Rename Conduct to Discipline
UPDATE subjects SET name = 'Discipline' WHERE name = 'Conduct' AND standard_id IN ('f7a9522b-1d2d-42c3-858c-4b0757ab7435', 'c0e1b5b4-0e7f-4120-96c0-c5dcbe7bb02c', '6c77527e-a193-49a4-b7c1-2a1a0832a035');

-- Delete extra subjects (including Computer (Co-scholastic))
DELETE FROM subjects WHERE name IN ('Life Values', 'Third Language', 'Spelling', 'Handwriting', 'Computer (Co-scholastic)') AND standard_id IN ('f7a9522b-1d2d-42c3-858c-4b0757ab7435', 'c0e1b5b4-0e7f-4120-96c0-c5dcbe7bb02c', '6c77527e-a193-49a4-b7c1-2a1a0832a035');

-- Insert Gujarati based on Hindi/Gujarati row
INSERT INTO subjects (name, code, sort_order, standard_id, evaluation_type)
SELECT 'Gujarati', code, sort_order + 1, standard_id, evaluation_type
FROM subjects 
WHERE name = 'Hindi/Gujarati' AND standard_id IN ('f7a9522b-1d2d-42c3-858c-4b0757ab7435', 'c0e1b5b4-0e7f-4120-96c0-c5dcbe7bb02c', '6c77527e-a193-49a4-b7c1-2a1a0832a035');

-- Rename Hindi/Gujarati to Hindi
UPDATE subjects SET name = 'Hindi' WHERE name = 'Hindi/Gujarati' AND standard_id IN ('f7a9522b-1d2d-42c3-858c-4b0757ab7435', 'c0e1b5b4-0e7f-4120-96c0-c5dcbe7bb02c', '6c77527e-a193-49a4-b7c1-2a1a0832a035');
