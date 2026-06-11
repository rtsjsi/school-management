-- Drop constraints if they already exist
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_standard_division_roll_number_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_udise_id_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_pen_no_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_apaar_id_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_aadhar_no_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_gr_number_key;

-- Deduplicate standard, division, roll_number (excluding null values)
-- We set duplicate roll numbers to NULL, keeping the oldest (min id) record's roll number.
UPDATE students
SET roll_number = NULL
WHERE id NOT IN (
  SELECT min(id::text)::uuid
  FROM students
  WHERE standard IS NOT NULL AND division IS NOT NULL AND roll_number IS NOT NULL
  GROUP BY standard, division, roll_number
) AND standard IS NOT NULL AND division IS NOT NULL AND roll_number IS NOT NULL;

-- Deduplicate udise_id
UPDATE students
SET udise_id = NULL
WHERE id NOT IN (
  SELECT min(id::text)::uuid
  FROM students
  WHERE udise_id IS NOT NULL AND udise_id <> ''
  GROUP BY udise_id
) AND udise_id IS NOT NULL AND udise_id <> '';

-- Deduplicate pen_no
UPDATE students
SET pen_no = NULL
WHERE id NOT IN (
  SELECT min(id::text)::uuid
  FROM students
  WHERE pen_no IS NOT NULL AND pen_no <> ''
  GROUP BY pen_no
) AND pen_no IS NOT NULL AND pen_no <> '';

-- Deduplicate apaar_id
UPDATE students
SET apaar_id = NULL
WHERE id NOT IN (
  SELECT min(id::text)::uuid
  FROM students
  WHERE apaar_id IS NOT NULL AND apaar_id <> ''
  GROUP BY apaar_id
) AND apaar_id IS NOT NULL AND apaar_id <> '';

-- Deduplicate aadhar_no
UPDATE students
SET aadhar_no = NULL
WHERE id NOT IN (
  SELECT min(id::text)::uuid
  FROM students
  WHERE aadhar_no IS NOT NULL AND aadhar_no <> ''
  GROUP BY aadhar_no
) AND aadhar_no IS NOT NULL AND aadhar_no <> '';

-- Deduplicate gr_number
UPDATE students
SET gr_number = NULL
WHERE id NOT IN (
  SELECT min(id::text)::uuid
  FROM students
  WHERE gr_number IS NOT NULL AND gr_number <> ''
  GROUP BY gr_number
) AND gr_number IS NOT NULL AND gr_number <> '';

-- Add Unique Constraints
ALTER TABLE students ADD CONSTRAINT students_standard_division_roll_number_key UNIQUE (standard, division, roll_number);
ALTER TABLE students ADD CONSTRAINT students_udise_id_key UNIQUE (udise_id);
ALTER TABLE students ADD CONSTRAINT students_pen_no_key UNIQUE (pen_no);
ALTER TABLE students ADD CONSTRAINT students_apaar_id_key UNIQUE (apaar_id);
ALTER TABLE students ADD CONSTRAINT students_aadhar_no_key UNIQUE (aadhar_no);
ALTER TABLE students ADD CONSTRAINT students_gr_number_key UNIQUE (gr_number);

