-- AcademicYear: add start_date, end_date, is_active for enrollment model
-- Enforce at most one active year via trigger

ALTER TABLE public.academic_years
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Backfill dates from name (e.g. 2024-2025 -> start 2024-06-01, end 2025-05-31)
UPDATE public.academic_years
SET start_date = (
    (SUBSTRING(name FROM 1 FOR 4))::int || '-06-01'
  )::date,
  end_date = (
    (SUBSTRING(name FROM 6 FOR 4))::int || '-05-31'
  )::date
WHERE name ~ '^\d{4}-\d{4}$' AND (start_date IS NULL OR end_date IS NULL);

-- Set first year as active if none set (one-time)
UPDATE public.academic_years
SET is_active = true
WHERE id = (SELECT id FROM public.academic_years ORDER BY sort_order ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM public.academic_years WHERE is_active = true);

-- Trigger: at most one active academic year
CREATE OR REPLACE FUNCTION public.enforce_single_active_academic_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.academic_years SET is_active = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_active_academic_year ON public.academic_years;
CREATE TRIGGER trigger_single_active_academic_year
  BEFORE INSERT OR UPDATE OF is_active ON public.academic_years
  FOR EACH ROW WHEN (NEW.is_active = true)
  EXECUTE PROCEDURE public.enforce_single_active_academic_year();

COMMENT ON COLUMN public.academic_years.start_date IS 'Academic year start date';
COMMENT ON COLUMN public.academic_years.end_date IS 'Academic year end date';
COMMENT ON COLUMN public.academic_years.is_active IS 'Only one row should be active (current year)';
