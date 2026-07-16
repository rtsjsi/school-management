-- Delete extra co-scholastic subjects from Class X that are not present in the Report Card DOCX
DELETE FROM subjects 
WHERE name IN ('Art & Craft', 'Dance', 'Karate') 
AND standard_id = (SELECT id FROM standards WHERE name = 'Class X');
