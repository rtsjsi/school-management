-- App roles for fee desk (clerk) and payroll-only staff
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'clerk';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'payroll';
