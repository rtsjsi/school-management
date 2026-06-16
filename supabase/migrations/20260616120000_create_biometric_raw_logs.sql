CREATE TABLE IF NOT EXISTS public.biometric_raw_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    method TEXT,
    url TEXT,
    headers JSONB,
    body TEXT
);

-- Enable RLS just to be safe, but we'll use the admin client (service role) to insert, bypassing RLS.
ALTER TABLE public.biometric_raw_logs ENABLE ROW LEVEL SECURITY;

-- Allow only service role to insert/select if needed, though service role bypasses RLS anyway.
-- Not adding any public policies since this is internal debug data.
