-- Clarify that students.grade stores current standard (class level) name, not exam grade.
-- App code uses "standard" for this concept; DB column name is kept for compatibility.
COMMENT ON COLUMN public.students.grade IS 'Current standard (class level) name, e.g. Primary 1, Secondary 6; synced from enrollment. Not exam grade (A/B/C).';
