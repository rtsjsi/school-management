-- Rename English Language to English -1 for Class 3-5
UPDATE subjects 
SET name = 'English -1' 
WHERE name = 'English Language' AND standard_id IN ('cf7774c0-3dda-4720-b05a-be14896edf0f', '80646a59-2475-46c0-bb96-e66cd2c549af', '862bda16-572b-43a2-a8f8-421cfb343932');

-- Rename English Literature to English -2 for Class 3-5
UPDATE subjects 
SET name = 'English -2' 
WHERE name = 'English Literature' AND standard_id IN ('cf7774c0-3dda-4720-b05a-be14896edf0f', '80646a59-2475-46c0-bb96-e66cd2c549af', '862bda16-572b-43a2-a8f8-421cfb343932');

-- Rename science to Science for Class 3-5
UPDATE subjects 
SET name = 'Science' 
WHERE name = 'science' AND standard_id IN ('cf7774c0-3dda-4720-b05a-be14896edf0f', '80646a59-2475-46c0-bb96-e66cd2c549af', '862bda16-572b-43a2-a8f8-421cfb343932');

-- Rename Conduct to Discipline for Class 3-5
UPDATE subjects 
SET name = 'Discipline' 
WHERE name = 'Conduct' AND standard_id IN ('cf7774c0-3dda-4720-b05a-be14896edf0f', '80646a59-2475-46c0-bb96-e66cd2c549af', '862bda16-572b-43a2-a8f8-421cfb343932');

-- Delete Life Values for Class 3-5
DELETE FROM subjects 
WHERE name = 'Life Values' AND standard_id IN ('cf7774c0-3dda-4720-b05a-be14896edf0f', '80646a59-2475-46c0-bb96-e66cd2c549af', '862bda16-572b-43a2-a8f8-421cfb343932');
