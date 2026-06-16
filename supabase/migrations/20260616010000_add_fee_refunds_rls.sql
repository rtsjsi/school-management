-- Grant permissions
GRANT ALL ON TABLE public.fee_refunds TO authenticated, anon, service_role;

-- Enable RLS
ALTER TABLE public.fee_refunds ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "fee_refunds_select" ON public.fee_refunds
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "fee_refunds_insert" ON public.fee_refunds
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "fee_refunds_update" ON public.fee_refunds
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "fee_refunds_delete" ON public.fee_refunds
  FOR DELETE TO authenticated USING (true);

-- Notify postgREST to reload the schema cache just in case
NOTIFY pgrst, 'reload schema';
