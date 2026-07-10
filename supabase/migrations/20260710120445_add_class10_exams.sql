DO $$ 
DECLARE
  v_ay_id UUID;
  v_user_id UUID;
  v_exam_id UUID;
  v_std RECORD;
  v_sub RECORD;
  v_exam RECORD;
  
  v_valid_standards TEXT[] := ARRAY['X'];
BEGIN
  -- 1. Get active academic year
  SELECT id INTO v_ay_id FROM public.academic_years WHERE status = 'active' LIMIT 1;
  IF v_ay_id IS NULL THEN
    RAISE EXCEPTION 'No active academic year found.';
  END IF;

  -- 2. Get admin user id
  SELECT id INTO v_user_id FROM public.profiles WHERE email = 'rtsjsi@gmail.com' LIMIT 1;

  -- 3. Create temp table for the exam configs
  CREATE TEMP TABLE temp_exams (name TEXT, term TEXT, mark_max INT);
  INSERT INTO temp_exams (name, term, mark_max) VALUES 
    ('CT-1', 'Term-1', 25),
    ('CT-2', 'Term-1', 25),
    ('Term-1', 'Term-1', 80),
    ('CT-3', 'Term-2', 25),
    ('CT-4', 'Term-2', 25),
    ('Pre board Exam', 'Term-2', 80);

  -- 4. Loop over standards
  FOR v_std IN SELECT id, name FROM public.standards WHERE name = ANY(v_valid_standards) LOOP
      
      FOR v_exam IN SELECT name, term, mark_max FROM temp_exams LOOP
        
        -- Check if exam already exists (idempotency)
        SELECT id INTO v_exam_id FROM public.exams 
        WHERE name = v_exam.name AND standard = v_std.name AND term = v_exam.term AND academic_year_id = v_ay_id LIMIT 1;

        IF v_exam_id IS NULL THEN
          -- Insert Exam
          INSERT INTO public.exams (name, standard, term, academic_year_id, created_by, updated_by)
          VALUES (v_exam.name, v_std.name, v_exam.term, v_ay_id, v_user_id, v_user_id)
          RETURNING id INTO v_exam_id;
        END IF;

        -- Insert Subjects for this standard
        FOR v_sub IN SELECT id, evaluation_type FROM public.subjects WHERE standard_id = v_std.id LOOP
          -- Check if subject link already exists
          IF NOT EXISTS (SELECT 1 FROM public.exam_subjects WHERE exam_id = v_exam_id AND subject_id = v_sub.id) THEN
            INSERT INTO public.exam_subjects (exam_id, subject_id, max_marks, passing_marks, created_by, updated_by)
            VALUES (
              v_exam_id, 
              v_sub.id, 
              CASE WHEN v_sub.evaluation_type = 'mark' THEN v_exam.mark_max ELSE 100 END,
              CASE WHEN v_sub.evaluation_type = 'mark' THEN CEIL(v_exam.mark_max * 0.33) ELSE 33 END,
              v_user_id, 
              v_user_id
            );
          END IF;
        END LOOP;

      END LOOP;
  END LOOP;
  
  DROP TABLE temp_exams;
END $$;
