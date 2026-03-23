-- Auto-maintain update audit fields across public tables.
-- Any UPDATE will set updated_at = now() and updated_by = auth user (when available).

CREATE OR REPLACE FUNCTION public.set_updated_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_sub TEXT;
BEGIN
  NEW.updated_at := now();

  jwt_sub := nullif(current_setting('request.jwt.claim.sub', true), '');
  IF jwt_sub IS NOT NULL THEN
    NEW.updated_by := jwt_sub::uuid;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    GROUP BY c.table_schema, c.table_name
    HAVING bool_or(c.column_name = 'updated_at') AND bool_or(c.column_name = 'updated_by')
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_audit_fields ON %I.%I',
      tbl.table_schema,
      tbl.table_name
    );

    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_audit_fields
       BEFORE UPDATE ON %I.%I
       FOR EACH ROW
       EXECUTE FUNCTION public.set_updated_audit_fields()',
      tbl.table_schema,
      tbl.table_name
    );
  END LOOP;
END
$$;
