-- Move shift timings to employees; remove shared shifts table.

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_start_time time;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_end_time time;

-- Copy existing shift timings from linked shift rows before drop.
DO $$
BEGIN
  IF to_regclass('public.shifts') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'shift_id'
     ) THEN
    UPDATE public.employees e
    SET
      shift_start_time = COALESCE(e.shift_start_time, s.start_time),
      shift_end_time = COALESCE(e.shift_end_time, s.end_time)
    FROM public.shifts s
    WHERE e.shift_id = s.id;
  END IF;
END $$;

ALTER TABLE public.employees DROP COLUMN IF EXISTS shift_id;

DROP TABLE IF EXISTS public.shifts CASCADE;
