-- Create storage bucket and RLS policies for student documents/photos.
-- Requires the storage schema (present in Supabase Cloud by default).

-- Bucket: student-uploads (private, 5MB, images + PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-uploads',
  'student-uploads',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies on storage.objects so authenticated users can manage files in this bucket
DROP POLICY IF EXISTS "Authenticated read student-uploads" ON storage.objects;
CREATE POLICY "Authenticated read student-uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'student-uploads');

DROP POLICY IF EXISTS "Authenticated insert student-uploads" ON storage.objects;
CREATE POLICY "Authenticated insert student-uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-uploads');

DROP POLICY IF EXISTS "Authenticated update student-uploads" ON storage.objects;
CREATE POLICY "Authenticated update student-uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'student-uploads')
  WITH CHECK (bucket_id = 'student-uploads');

DROP POLICY IF EXISTS "Authenticated delete student-uploads" ON storage.objects;
CREATE POLICY "Authenticated delete student-uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'student-uploads');
