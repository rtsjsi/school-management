-- Fee structures: define fee by standard/grade range (e.g., 1-6, 7-9)
CREATE TABLE public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_from TEXT NOT NULL,
  grade_to TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read fee_structures" ON public.fee_structures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage fee_structures" ON public.fee_structures FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_fee_structures_academic_year ON public.fee_structures(academic_year);

-- Fee structure items: per structure, per quarter, fee type and amount
CREATE TABLE public.fee_structure_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL DEFAULT 'tuition',
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fee_structure_id, fee_type, quarter)
);

ALTER TABLE public.fee_structure_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read fee_structure_items" ON public.fee_structure_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage fee_structure_items" ON public.fee_structure_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_fee_structure_items_structure ON public.fee_structure_items(fee_structure_id);

-- Fee dues: what each student owes (per quarter, per fee type)
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS quarter INTEGER CHECK (quarter >= 1 AND quarter <= 4);
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0 CHECK (paid_amount >= 0);
CREATE INDEX IF NOT EXISTS idx_fees_quarter ON public.fees(quarter);
CREATE INDEX IF NOT EXISTS idx_fees_academic_year ON public.fees(academic_year);

-- Fee collections: payment records with receipt, payment mode, cheque/online details
CREATE TABLE public.fee_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_id UUID REFERENCES public.fees(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  academic_year TEXT NOT NULL,
  fee_type TEXT NOT NULL DEFAULT 'tuition',
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'cheque', 'online')),
  cheque_number TEXT,
  cheque_bank TEXT,
  cheque_date DATE,
  online_transaction_id TEXT,
  online_transaction_ref TEXT,
  receipt_number TEXT UNIQUE NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read fee_collections" ON public.fee_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage fee_collections" ON public.fee_collections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_fee_collections_student_id ON public.fee_collections(student_id);
CREATE INDEX idx_fee_collections_collected_at ON public.fee_collections(collected_at);
CREATE INDEX idx_fee_collections_receipt_number ON public.fee_collections(receipt_number);
CREATE INDEX idx_fee_collections_payment_mode ON public.fee_collections(payment_mode);
CREATE INDEX idx_fee_collections_quarter_year ON public.fee_collections(quarter, academic_year);

-- Receipt number sequence for auto-generation
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

COMMENT ON TABLE public.fee_structures IS 'Fee structure definition by grade range (e.g., 1-6 std, 7-9 std)';
COMMENT ON TABLE public.fee_structure_items IS 'Per-structure fee amounts per quarter';
COMMENT ON TABLE public.fee_collections IS 'Fee payment records with receipt, cheque/online details';
