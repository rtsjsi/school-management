-- School master settings: name, logo, principal signature, etc. (single row, principal-only write)
CREATE TABLE IF NOT EXISTS public.school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'School',
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_path TEXT,
  principal_signature_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read school_settings"
  ON public.school_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Principal can manage school_settings"
  ON public.school_settings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'principal')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'principal')
  );

COMMENT ON TABLE public.school_settings IS 'Single-row master: school name, logo, principal signature; used in receipts, report cards, etc.';

-- Ensure one row (upsert by fixed id)
INSERT INTO public.school_settings (id, name, address)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'School', NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for school assets (logo, signature) - public read for use in PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-assets',
  'school-assets',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read school-assets" ON storage.objects;
CREATE POLICY "Public read school-assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Authenticated manage school-assets" ON storage.objects;
CREATE POLICY "Authenticated manage school-assets"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'school-assets')
  WITH CHECK (bucket_id = 'school-assets');
