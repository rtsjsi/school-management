# Supabase Database Standard Operating Procedure (SOP)

For **ANY** database operation, schema modification, or data manipulation, you **MUST** follow this proactive SOP workflow exclusively to avoid conflicts and authentication errors.

## Step 1: Create Migration
Generate a new migration file for your changes:
`npx supabase migration new <name>`
*Proactive Note:* This command creates the file instantly but may hang in the background. **Do NOT wait indefinitely** for the process to exit. Verify the file exists in `supabase/migrations/` and proceed.

## Step 2: Write SQL
Open the newly generated migration file and write your SQL queries (CREATE, ALTER, DROP, etc.).

## Step 3: Proactive Push
Push the migration to the remote database. You do NOT need to run `supabase link`. By providing the project ID natively, the CLI works entirely stateless (like in CI/CD). To avoid the CLI silently failing to read the credentials, you **MUST** explicitly inject the credentials into the environment dynamically from the correct environment file (use `.env.main` for the `main` branch, and `.env.development` for any other branch):

For `main` branch:
`$env:SUPABASE_DB_PASSWORD=(Get-Content .env.main | ConvertFrom-StringData).SUPABASE_DB_PASSWORD.Trim('"'); $env:SUPABASE_PROJECT_ID=(Get-Content .env.main | ConvertFrom-StringData).SUPABASE_PROJECT_ID.Trim('"'); npx supabase db push`

For `development` (and other) branches:
`$env:SUPABASE_DB_PASSWORD=(Get-Content .env.development | ConvertFrom-StringData).SUPABASE_DB_PASSWORD.Trim('"'); $env:SUPABASE_PROJECT_ID=(Get-Content .env.development | ConvertFrom-StringData).SUPABASE_PROJECT_ID.Trim('"'); npx supabase db push`

## Step 3 (Fallback): Apply via the Management API over HTTPS
`supabase db push` opens a **direct PostgreSQL connection** to `db.<project-ref>.supabase.co`. That host is **IPv6-only**, so on networks without an IPv6 route the push fails with:

```
IPv6 is not supported on your current network: dial tcp: lookup db.<ref>.supabase.co: no such host
```

The `SUPABASE_ACCESS_TOKEN` does **not** fix this — it only authenticates the HTTPS **Management API**, which is a different transport. When the direct push fails for network reasons, apply the migration over HTTPS instead (this is exactly what the Supabase dashboard SQL editor does and it has no IPv6 requirement):

1. Read `SUPABASE_PROJECT_ID` and `SUPABASE_ACCESS_TOKEN` from the branch's env file (`.env.development` for non-`main`, `.env.main` for `main`).
2. POST the **entire** migration SQL to `https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_ID}/database/query` with header `Authorization: Bearer {SUPABASE_ACCESS_TOKEN}` and JSON body `{ "query": "<full SQL>" }`. A `2xx` status means success.
3. Record the migration so the CLI treats it as applied later:
   `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('<timestamp-prefix>', '<name>') ON CONFLICT (version) DO NOTHING;`
4. Verify with a quick `SELECT to_regclass('public.<new_table>'), ...` query.

A tiny throwaway Node script (Node 18+ has global `fetch`) is the easiest way to send multi-statement SQL without shell-escaping pain — create it, run it, then delete it (do not commit it).

**Token caveat:** if the Management API returns `401 Unauthorized` (even on `GET https://api.supabase.com/v1/projects`), the `SUPABASE_ACCESS_TOKEN` in the env file is expired/revoked — ask the user to paste a fresh personal access token into the correct env file, then retry.

**Idempotency:** always write migrations defensively (`CREATE TABLE/INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `INSERT ... ON CONFLICT DO NOTHING`) so applying via either transport — or re-applying — is always safe.

## Strict Environment Boundaries
**CRITICAL RULE:** When operating on a branch other than `main` (such as `development`), you **MUST NOT** connect to, query, or modify the PROD database unless the user explicitly and unambiguously commands you to do so. Always default to querying and interacting with the database that corresponds to the active branch (e.g., DEV database for `development` branch).

## Database access (no MCP)
**Do not use Supabase MCP** (`apply_migration`, `execute_sql`, `list_tables`, etc.) for database work in this project. Use only:
- `npx supabase db push` with credentials from the branch env file (Step 3 above), or
- the Management API fallback (Step 3 Fallback above).

Confirm the target ref matches `SUPABASE_PROJECT_ID` in `.env.development` (non-`main`) or `.env.main` (`main`) before running anything.
