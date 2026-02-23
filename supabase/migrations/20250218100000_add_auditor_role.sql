-- Add auditor role for read-only access (view fees, expenses, payroll, etc.; no create/edit/delete)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'auditor';
