-- Rename exams.grade -> exams.standard and drop unused exams.subject column.

ALTER TABLE public.exams
  RENAME COLUMN grade TO standard;

ALTER TABLE public.exams
  DROP COLUMN IF EXISTS subject;

