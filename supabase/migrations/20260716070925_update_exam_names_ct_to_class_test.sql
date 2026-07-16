UPDATE exams 
SET name = replace(name, 'CT-', 'Class Test ') 
WHERE name LIKE 'CT-%';
