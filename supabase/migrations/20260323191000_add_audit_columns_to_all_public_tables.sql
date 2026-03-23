-- Ensure all public tables have common audit columns.
-- Adds only missing columns and leaves existing ones unchanged.
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I
         ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
         ADD COLUMN IF NOT EXISTS created_by UUID,
         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
         ADD COLUMN IF NOT EXISTS updated_by UUID',
      tbl.table_schema,
      tbl.table_name
    );
  END LOOP;
END
$$;
