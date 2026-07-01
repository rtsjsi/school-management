-- Rename parent_contact and parent_email to father_contact and father_email
ALTER TABLE students
  RENAME COLUMN parent_contact TO father_contact;
ALTER TABLE students
  RENAME COLUMN parent_email TO father_email;

-- Remove deprecated student profile fields
ALTER TABLE students
  DROP COLUMN IF EXISTS birth_certificate_number,
  DROP COLUMN IF EXISTS permanent_address_line1,
  DROP COLUMN IF EXISTS permanent_address_line2,
  DROP COLUMN IF EXISTS permanent_city,
  DROP COLUMN IF EXISTS permanent_taluka,
  DROP COLUMN IF EXISTS permanent_district,
  DROP COLUMN IF EXISTS permanent_state,
  DROP COLUMN IF EXISTS permanent_pincode,
  DROP COLUMN IF EXISTS permanent_country,
  DROP COLUMN IF EXISTS previous_school_address,
  DROP COLUMN IF EXISTS parent_name,
  DROP COLUMN IF EXISTS guardian_name,
  DROP COLUMN IF EXISTS guardian_contact,
  DROP COLUMN IF EXISTS guardian_email,
  DROP COLUMN IF EXISTS emergency_contact_name,
  DROP COLUMN IF EXISTS emergency_contact_number,
  DROP COLUMN IF EXISTS hobby,
  DROP COLUMN IF EXISTS sign_of_identity,
  DROP COLUMN IF EXISTS father_education,
  DROP COLUMN IF EXISTS father_occupation,
  DROP COLUMN IF EXISTS mother_education,
  DROP COLUMN IF EXISTS mother_occupation,
  DROP COLUMN IF EXISTS guardian_education,
  DROP COLUMN IF EXISTS guardian_occupation;
