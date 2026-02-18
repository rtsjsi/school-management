-- Student photos: one row per role (student, mother, father) per student
CREATE TABLE public.student_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'mother', 'father')),
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, role)
);

CREATE INDEX idx_student_photos_student_id ON public.student_photos(student_id);

ALTER TABLE public.student_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read student_photos"
  ON public.student_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert student_photos"
  ON public.student_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update student_photos"
  ON public.student_photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete student_photos"
  ON public.student_photos FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.student_photos IS 'Photo file paths for student, mother, father (stored in storage bucket)';

-- Student documents: one row per document type per student
CREATE TABLE public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'admission_form', 'leaving_cert', 'birth_cert', 'aadhar', 'caste_cert', 'other'
  )),
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, document_type)
);

CREATE INDEX idx_student_documents_student_id ON public.student_documents(student_id);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read student_documents"
  ON public.student_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert student_documents"
  ON public.student_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update student_documents"
  ON public.student_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete student_documents"
  ON public.student_documents FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.student_documents IS 'Document file paths (admission, birth cert, aadhar, etc.) stored in storage bucket';

-- Storage bucket for student uploads. Create via Dashboard if not using Supabase CLI:
-- Storage -> New bucket -> id: student-uploads, private, allow images + PDF
-- Then add policies so authenticated users can SELECT, INSERT, UPDATE, DELETE on bucket_id = 'student-uploads'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'student-uploads',
      'student-uploads',
      false,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
