# SQL scripts for Supabase

**01-export-profiles-from-prod.sql** — Run in **PROD** (main) project → SQL Editor. Copy the result (email, full_name, role).

**02-sync-profiles-on-dev.sql** — Run in **DEV** project → SQL Editor. Replace the `VALUES` row with the rows from the prod export. This updates `public.profiles` (role, full_name) for users that already exist in dev (same email).

Note: These scripts only sync **profile** data (role, full_name). They do not create new auth users. To copy auth users from prod to dev, use `npm run sync-users:prod-to-dev` (see docs/supabase-branches.md).
