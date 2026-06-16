CREATE TABLE fee_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_collection_id UUID NOT NULL REFERENCES fee_collections(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    refund_date DATE NOT NULL,
    refund_mode TEXT NOT NULL CHECK (refund_mode IN ('cash', 'cheque', 'online')),
    refund_reason TEXT NOT NULL,
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster lookup of refunds per receipt
CREATE INDEX idx_fee_refunds_fee_collection_id ON fee_refunds(fee_collection_id);
