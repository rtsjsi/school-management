DO $$ 
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Find the user ID
  SELECT id INTO v_user_id FROM public.profiles WHERE email = 'rtsjsi@gmail.com' LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE WARNING 'User rtsjsi@gmail.com not found. Skipping created_by/updated_by updates.';
  ELSE
    -- 2. Update the exams table
    UPDATE public.exams 
    SET term = 'Term-1', created_by = v_user_id, updated_by = v_user_id 
    WHERE name = 'Class Test-1' AND standard = 'I' AND term = 'Term 1';

    -- 3. Update the exam_subjects table
    UPDATE public.exam_subjects 
    SET created_by = v_user_id, updated_by = v_user_id 
    WHERE exam_id IN (SELECT id FROM public.exams WHERE name = 'Class Test-1' AND standard = 'I' AND term = 'Term-1');
  END IF;
END $$;
