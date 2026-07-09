DO $$ 
DECLARE
  v_ay_id UUID;
  v_user_id UUID;
  v_exam_id UUID;
  v_std RECORD;
  v_sub RECORD;
  v_term TEXT;
  v_exam RECORD;
  
  -- We'll just define the classes we care about in an array
  v_valid_standards TEXT[] := ARRAY['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI Science', 'XII Science'];
  v_terms TEXT[] := ARRAY['Term-1', 'Term-2'];
BEGIN
  -- 1. Get active academic year
  SELECT id INTO v_ay_id FROM public.academic_years WHERE status = 'active' LIMIT 1;
  IF v_ay_id IS NULL THEN
    RAISE EXCEPTION 'No active academic year found.';
  END IF;

  -- 2. Get admin user id
  SELECT id INTO v_user_id FROM public.profiles WHERE email = 'rtsjsi@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE WARNING 'User rtsjsi@gmail.com not found. created_by will be null';
  END IF;

  -- 3. Create temp table for the exam configs
  CREATE TEMP TABLE temp_exams (name TEXT, mark_max INT);
  INSERT INTO temp_exams (name, mark_max) VALUES 
    ('Class Test-1', 20),
    ('Class Test-2', 20),
    ('Project', 30),
    ('Written', 80);

  -- 4. Loop over standards
  FOR v_std IN SELECT id, name FROM public.standards WHERE name = ANY(v_valid_standards) LOOP
    
    FOR v_term IN SELECT unnest(v_terms) LOOP
      
      FOR v_exam IN SELECT name, mark_max FROM temp_exams LOOP
        
        -- Skip the one we already created manually in the previous migrations
        IF v_std.name = 'I' AND v_term = 'Term-1' AND v_exam.name = 'Class Test-1' THEN
          CONTINUE;
        END IF;

        -- Check if exam already exists (idempotency)
        SELECT id INTO v_exam_id FROM public.exams 
        WHERE name = v_exam.name AND standard = v_std.name AND term = v_term AND academic_year_id = v_ay_id LIMIT 1;

        IF v_exam_id IS NULL THEN
          -- Insert Exam
          INSERT INTO public.exams (name, standard, term, academic_year_id, created_by, updated_by)
          VALUES (v_exam.name, v_std.name, v_term, v_ay_id, v_user_id, v_user_id)
          RETURNING id INTO v_exam_id;
        END IF;

        -- Insert Subjects for this standard
        FOR v_sub IN SELECT id, evaluation_type FROM public.subjects WHERE standard_id = v_std.id LOOP
          -- Check if subject link already exists
          IF NOT EXISTS (SELECT 1 FROM public.exam_subjects WHERE exam_id = v_exam_id AND subject_id = v_sub.id) THEN
            INSERT INTO public.exam_subjects (exam_id, subject_id, max_marks, created_by, updated_by)
            VALUES (
              v_exam_id, 
              v_sub.id, 
              CASE WHEN v_sub.evaluation_type = 'mark' THEN v_exam.mark_max ELSE 100 END,
              v_user_id, 
              v_user_id
            );
          END IF;
        END LOOP;

      END LOOP;
    END LOOP;
  END LOOP;
  
  DROP TABLE temp_exams;
END $$;
