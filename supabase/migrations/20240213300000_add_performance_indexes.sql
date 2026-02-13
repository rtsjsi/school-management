-- Add indexes to improve query performance

-- Profiles table: index on role for RLS policy subqueries and auth checks
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Profiles table: email index for lookups (if needed for user searches)
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Students table: indexes on frequently filtered columns
CREATE INDEX idx_students_email ON public.students(email);
CREATE INDEX idx_students_grade ON public.students(grade);
CREATE INDEX idx_students_section ON public.students(section);

-- Employees table: indexes on frequently filtered columns
CREATE INDEX idx_employees_email ON public.employees(email);
CREATE INDEX idx_employees_role ON public.employees(role);
CREATE INDEX idx_employees_department ON public.employees(department);

-- Analyze tables so query planner has up-to-date statistics
ANALYZE public.profiles;
ANALYZE public.students;
ANALYZE public.employees;
ANALYZE public.fees;
ANALYZE public.exams;
ANALYZE public.exam_results;
ANALYZE public.expenses;

COMMENT ON INDEX idx_profiles_role IS 'Speeds up RLS policy checks and role-based queries';
COMMENT ON INDEX idx_profiles_email IS 'Speeds up profile lookups by email';
COMMENT ON INDEX idx_students_email IS 'Speeds up student searches by email';
COMMENT ON INDEX idx_students_grade IS 'Speeds up filtering students by grade';
COMMENT ON INDEX idx_students_section IS 'Speeds up filtering students by section';
COMMENT ON INDEX idx_employees_email IS 'Speeds up employee searches by email';
COMMENT ON INDEX idx_employees_role IS 'Speeds up filtering employees by role';
COMMENT ON INDEX idx_employees_department IS 'Speeds up filtering employees by department';
