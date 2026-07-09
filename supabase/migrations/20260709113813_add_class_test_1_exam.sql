DO $$ 
DECLARE
  v_ay_id UUID;
  v_exam_id UUID;
BEGIN
  -- 1. Get the currently active academic year
  SELECT id INTO v_ay_id FROM public.academic_years WHERE status = 'active' LIMIT 1;
  
  IF v_ay_id IS NULL THEN
    RAISE EXCEPTION 'No active academic year found.';
  END IF;

  -- 2. Insert the exam 'Class Test-1' for Standard 'I' in 'Term 1'
  INSERT INTO public.exams (name, standard, term, academic_year_id)
  VALUES ('Class Test-1', 'I', 'Term 1', v_ay_id)
  RETURNING id INTO v_exam_id;

  -- 3. Link ALL subjects (mark & grade based) for Standard 'I' to the new exam
  --    Setting max_marks = 20 for 'mark' based subjects, and 100 for 'grade' based subjects
  INSERT INTO public.exam_subjects (exam_id, subject_id, max_marks)
  SELECT 
    v_exam_id, 
    s.id, 
    CASE WHEN s.evaluation_type = 'mark' THEN 20 ELSE 100 END
  FROM public.subjects s
  JOIN public.standards st ON s.standard_id = st.id
  WHERE st.name = 'I';
  
END $$;
