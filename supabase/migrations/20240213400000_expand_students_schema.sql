-- Expand students table with complete personal, guardian, and academic information

-- Add new columns to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS student_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', NULL)),
ADD COLUMN IF NOT EXISTS blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', NULL)),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS admission_date DATE,
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20),
ADD COLUMN IF NOT EXISTS roll_number INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred', 'graduated', 'suspended')),
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS parent_contact VARCHAR(20),
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS parent_relationship TEXT DEFAULT 'father' CHECK (parent_relationship IN ('father', 'mother', 'guardian', 'other')),
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_contact VARCHAR(20),
ADD COLUMN IF NOT EXISTS guardian_email TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_admission_date ON public.students(admission_date);
CREATE INDEX IF NOT EXISTS idx_students_academic_year ON public.students(academic_year);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students(full_name);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);

-- Add comments for documentation
COMMENT ON COLUMN public.students.student_id IS 'Human-readable student ID (e.g., STU-2025-001)';
COMMENT ON COLUMN public.students.gender IS 'Student gender: male, female, or other';
COMMENT ON COLUMN public.students.blood_group IS 'Blood group for medical records';
COMMENT ON COLUMN public.students.address IS 'Residential address of student';
COMMENT ON COLUMN public.students.phone_number IS 'Contact phone number for student';
COMMENT ON COLUMN public.students.admission_date IS 'Date of admission to school';
COMMENT ON COLUMN public.students.academic_year IS 'Academic year (e.g., 2024-2025)';
COMMENT ON COLUMN public.students.roll_number IS 'Roll number in class section';
COMMENT ON COLUMN public.students.status IS 'Student status: active, inactive, transferred, graduated, or suspended';
COMMENT ON COLUMN public.students.parent_name IS 'Primary parent/guardian name';
COMMENT ON COLUMN public.students.parent_contact IS 'Parent contact phone number';
COMMENT ON COLUMN public.students.parent_email IS 'Parent email address';
COMMENT ON COLUMN public.students.parent_relationship IS 'Relationship to student (father, mother, guardian, other)';
COMMENT ON COLUMN public.students.guardian_name IS 'Guardian name if different from parent';
COMMENT ON COLUMN public.students.guardian_contact IS 'Guardian contact phone number';
COMMENT ON COLUMN public.students.guardian_email IS 'Guardian email address';
COMMENT ON COLUMN public.students.emergency_contact_name IS 'Emergency contact person name';
COMMENT ON COLUMN public.students.emergency_contact_number IS 'Emergency contact phone number';
COMMENT ON COLUMN public.students.emergency_contact_relationship IS 'Relationship of emergency contact';
COMMENT ON COLUMN public.students.notes IS 'Additional notes or remarks about student';

-- Update ANALYZE for query planner optimization
ANALYZE public.students;
