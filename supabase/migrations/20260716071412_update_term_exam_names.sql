UPDATE exams 
SET name = replace(name, 'Term-', 'Term Exam - ') 
WHERE name LIKE 'Term-%';
