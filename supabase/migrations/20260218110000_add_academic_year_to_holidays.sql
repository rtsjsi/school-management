-- Link holidays to academic years so that holidays can be scoped per AY.

ALTER TABLE public.holidays
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- Optional: index for faster filtering by academic year.
CREATE INDEX IF NOT EXISTS idx_holidays_academic_year_id ON public.holidays(academic_year_id);

