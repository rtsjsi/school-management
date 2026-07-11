-- Raw biometric punches from the Windows tray sync (device fields as received).
-- Dedup supports occasional full PullAll dumps from the device.

CREATE TABLE IF NOT EXISTS public.biometric_attendance_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enroll_no text NOT NULL,
  punched_at timestamptz NOT NULL,
  direction text NOT NULL,
  verify_method text,
  machine_no integer NOT NULL,
  raw_verify_mode integer NOT NULL DEFAULT 0,
  photo_index integer,
  received_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  sync_batch_id uuid
);

-- Natural punch identity: full re-syncs skip rows already stored.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'biometric_attendance_raw_natural_key'
  ) THEN
    ALTER TABLE public.biometric_attendance_raw
      ADD CONSTRAINT biometric_attendance_raw_natural_key
      UNIQUE (machine_no, enroll_no, punched_at, direction, raw_verify_mode);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS biometric_attendance_raw_punched_at_idx
  ON public.biometric_attendance_raw (punched_at);

CREATE INDEX IF NOT EXISTS biometric_attendance_raw_enroll_no_idx
  ON public.biometric_attendance_raw (enroll_no);

CREATE INDEX IF NOT EXISTS biometric_attendance_raw_sync_batch_id_idx
  ON public.biometric_attendance_raw (sync_batch_id);

ALTER TABLE public.biometric_attendance_raw ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated: inserts/selects go through service role only.
