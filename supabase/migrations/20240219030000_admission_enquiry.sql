-- Admission enquiries: prospective students / leads
CREATE TABLE public.admission_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  class_of_interest TEXT,
  enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'visit_scheduled', 'admitted', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admission_enquiries_status ON public.admission_enquiries(status);
CREATE INDEX idx_admission_enquiries_enquiry_date ON public.admission_enquiries(enquiry_date);
CREATE INDEX idx_admission_enquiries_class ON public.admission_enquiries(class_of_interest);

ALTER TABLE public.admission_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read admission_enquiries"
  ON public.admission_enquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage admission_enquiries"
  ON public.admission_enquiries FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.admission_enquiries IS 'Prospective student enquiries before admission';
