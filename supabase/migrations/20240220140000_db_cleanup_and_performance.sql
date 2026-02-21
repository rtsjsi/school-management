-- DB cleanup and performance (after full schema review)
--
-- Review summary:
-- - No unused tables found: all tables are referenced by the app (classes, class_divisions,
--   standards, divisions, student_enrollments, fee_*, students, employees, etc.).
-- - classes + class_divisions and standards + divisions are both in use (different features);
--   do not remove.
-- - Redundant or obsolete indexes: none identified (idx_students_section already dropped
--   in unified_naming when section was renamed to division).
--
-- Performance: add missing indexes for common filters and lookups.

-- academic_years: "current year" lookup (getActiveAcademicYearId) filters by is_active = true
CREATE INDEX IF NOT EXISTS idx_academic_years_is_active
  ON public.academic_years(is_active)
  WHERE is_active = true;

-- fee_collections: reports and APIs often filter by academic_year alone
CREATE INDEX IF NOT EXISTS idx_fee_collections_academic_year
  ON public.fee_collections(academic_year);

-- employees: many lists filter by status = 'active'
CREATE INDEX IF NOT EXISTS idx_employees_status
  ON public.employees(status);

-- Refresh statistics for the query planner
ANALYZE public.academic_years;
ANALYZE public.fee_collections;
ANALYZE public.employees;
ANALYZE public.student_enrollments;
ANALYZE public.students;

COMMENT ON INDEX idx_academic_years_is_active IS 'Speeds up current academic year lookup';
COMMENT ON INDEX idx_fee_collections_academic_year IS 'Speeds up fee reports by year';
COMMENT ON INDEX idx_employees_status IS 'Speeds up filtering employees by status';
