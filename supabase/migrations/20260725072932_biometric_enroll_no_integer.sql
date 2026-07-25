-- Convert employees.biometric_enroll_no from text to integer (device EnNo is numeric).

DROP INDEX IF EXISTS public.employees_biometric_enroll_no_key;

ALTER TABLE public.employees
  ALTER COLUMN biometric_enroll_no TYPE integer
  USING (
    CASE
      WHEN biometric_enroll_no IS NULL THEN NULL
      WHEN trim(biometric_enroll_no) = '' THEN NULL
      WHEN trim(biometric_enroll_no) ~ '^[0-9]+$' THEN trim(biometric_enroll_no)::integer
      ELSE NULL
    END
  );

CREATE UNIQUE INDEX IF NOT EXISTS employees_biometric_enroll_no_key
  ON public.employees (biometric_enroll_no)
  WHERE biometric_enroll_no IS NOT NULL;
