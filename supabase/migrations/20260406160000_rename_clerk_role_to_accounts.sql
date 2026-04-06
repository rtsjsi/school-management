-- Rename Clerk → Accounts for workspace profile roles.

-- 1) PostgreSQL enum: rename label when it exists on a public schema type.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch, t.typname AS typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE e.enumlabel = 'clerk' AND n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER TYPE %I.%I RENAME VALUE ''clerk'' TO ''accounts''', r.sch, r.typname);
  END LOOP;
END $$;

-- 2) Text / varchar role column: update literals (covers non-enum storage).
UPDATE public.profiles SET role = 'accounts' WHERE role::text = 'clerk';
