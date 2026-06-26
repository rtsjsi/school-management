-- Add status, approved_by, approved_at, and rejection_reason columns
ALTER TABLE fee_refunds ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE fee_refunds ADD COLUMN approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE fee_refunds ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE fee_refunds ADD COLUMN rejection_reason TEXT;

-- Set default for future inserts to 'pending'
ALTER TABLE fee_refunds ALTER COLUMN status SET DEFAULT 'pending';
