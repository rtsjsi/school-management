-- Remove unused biometric webhook debug log table (live device feed was never wired to payroll).

DROP TABLE IF EXISTS public.biometric_raw_logs;
