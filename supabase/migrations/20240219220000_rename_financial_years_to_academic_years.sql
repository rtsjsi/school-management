-- Rename financial_years to academic_years throughout
ALTER TABLE IF EXISTS public.financial_years RENAME TO academic_years;

ALTER INDEX IF EXISTS idx_financial_years_sort RENAME TO idx_academic_years_sort;

DROP POLICY IF EXISTS "Authenticated can read financial_years" ON public.academic_years;
DROP POLICY IF EXISTS "Authenticated can manage financial_years" ON public.academic_years;

CREATE POLICY "Authenticated can read academic_years"
  ON public.academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage academic_years"
  ON public.academic_years FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.academic_years IS 'Academic years for dropdowns (e.g. 2024-2025)';
