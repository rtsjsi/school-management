-- Delete data from ALL Supabase database tables (public + auth + storage).
-- Run in Supabase Dashboard → SQL Editor, or: npm run db:flush
-- Requires service role. After this, the DB is clean; everyone must sign up again.

-- 1. Public schema (profiles, students, employees, fees, etc.)
DO $$
DECLARE
  r RECORD;
  tbls text := '';
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename)
  LOOP
    tbls := tbls || 'public.' || quote_ident(r.tablename) || ', ';
  END LOOP;
  IF tbls <> '' THEN
    tbls := rtrim(tbls, ', ');
    EXECUTE 'TRUNCATE TABLE ' || tbls || ' RESTART IDENTITY CASCADE';
    RAISE NOTICE 'Truncated all public tables.';
  END IF;
END $$;

-- 2. Auth (users, sessions, identities, refresh_tokens)
TRUNCATE TABLE auth.sessions CASCADE;
TRUNCATE TABLE auth.refresh_tokens CASCADE;
TRUNCATE TABLE auth.identities CASCADE;
TRUNCATE TABLE auth.users CASCADE;

-- 3. Storage object metadata
TRUNCATE TABLE storage.objects CASCADE;
