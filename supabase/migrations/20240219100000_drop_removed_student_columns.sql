-- Drop columns removed from student master UI
ALTER TABLE public.students
DROP COLUMN IF EXISTS admission_form_no,
DROP COLUMN IF EXISTS student_type,
DROP COLUMN IF EXISTS transport_required,
DROP COLUMN IF EXISTS transport_route,
DROP COLUMN IF EXISTS transport_pickup_point,
DROP COLUMN IF EXISTS fees_due_date,
DROP COLUMN IF EXISTS parent_relationship,
DROP COLUMN IF EXISTS father_birth_date,
DROP COLUMN IF EXISTS mother_birth_date,
DROP COLUMN IF EXISTS parents_anniversary,
DROP COLUMN IF EXISTS father_designation,
DROP COLUMN IF EXISTS mother_designation,
DROP COLUMN IF EXISTS yearly_income,
DROP COLUMN IF EXISTS guardian_designation;
