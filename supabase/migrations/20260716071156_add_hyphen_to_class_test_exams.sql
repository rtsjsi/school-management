UPDATE exams 
SET name = replace(name, 'Class Test ', 'Class Test - ') 
WHERE name LIKE 'Class Test %';
