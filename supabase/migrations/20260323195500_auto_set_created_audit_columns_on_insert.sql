-- Auto-maintain create audit fields across public tables.
-- Any INSERT will set created_at (if missing) and created_by from auth user (when available).

CREATE OR REPLACE FUNCTION public.set_created_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_sub TEXT;
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  IF NEW.created_by IS NULL THEN
    jwt_sub := nullif(current_setting('request.jwt.claim.sub', true), '');
    IF jwt_sub IS NOT NULL THEN
      NEW.created_by := jwt_sub::uuid;
    END IF;
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
    HAVING bool_or(c.column_name = 'created_at') AND bool_or(c.column_name = 'created_by')
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_created_audit_fields ON %I.%I',
      tbl.table_schema,
      tbl.table_name
    );

    EXECUTE format(
      'CREATE TRIGGER trg_set_created_audit_fields
       BEFORE INSERT ON %I.%I
       FOR EACH ROW
       EXECUTE FUNCTION public.set_created_audit_fields()',
      tbl.table_schema,
      tbl.table_name
    );
  END LOOP;
END
$$;
