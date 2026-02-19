-- Subject master per class with evaluation type (grade vs mark based)

-- Add new columns to subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS evaluation_type TEXT NOT NULL DEFAULT 'mark' CHECK (evaluation_type IN ('grade', 'mark'));
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS max_marks NUMERIC(6, 2);

-- Drop old unique constraint on name (subjects can repeat per class)
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_name_key;

-- Unique subject name per class (only when class_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_class_name ON public.subjects(class_id, name);

-- Migrate existing subjects: create per-class copies from global subjects
INSERT INTO public.subjects (class_id, name, code, sort_order, evaluation_type, max_marks)
SELECT c.id, s.name, s.code, s.sort_order, COALESCE(s.evaluation_type, 'mark'), COALESCE(s.max_marks, 100)
FROM public.subjects s
CROSS JOIN public.classes c
WHERE s.class_id IS NULL;

-- Update exam_result_subjects to point to class-specific subjects (match student grade -> class)
UPDATE public.exam_result_subjects ers
SET subject_id = (
  SELECT ns.id FROM public.subjects ns
  JOIN public.students st ON st.id = ers.student_id
  JOIN public.classes c ON c.name = st.grade AND c.id = ns.class_id
  WHERE ns.name = (SELECT name FROM public.subjects WHERE id = ers.subject_id LIMIT 1)
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.students st
  JOIN public.classes c ON c.name = st.grade
  WHERE st.id = ers.student_id
  AND EXISTS (SELECT 1 FROM public.subjects ns WHERE ns.class_id = c.id AND ns.name = (SELECT name FROM public.subjects WHERE id = ers.subject_id))
);

-- Delete orphaned exam_result_subjects (student grade not in classes, or no matching class subject)
DELETE FROM public.exam_result_subjects
WHERE subject_id IN (SELECT id FROM public.subjects WHERE class_id IS NULL);

-- Delete old global subjects
DELETE FROM public.subjects WHERE class_id IS NULL;

-- Make class_id required
ALTER TABLE public.subjects ALTER COLUMN class_id SET NOT NULL;

-- Add grade column to exam_result_subjects for grade-based evaluation
ALTER TABLE public.exam_result_subjects ADD COLUMN IF NOT EXISTS grade TEXT;

COMMENT ON COLUMN public.subjects.evaluation_type IS 'grade = enter grade (A/B/C); mark = enter marks out of max_marks';
COMMENT ON COLUMN public.subjects.max_marks IS 'Maximum marks for mark-based evaluation';
COMMENT ON COLUMN public.exam_result_subjects.grade IS 'Grade for grade-based subjects (e.g. A, B, C)';
