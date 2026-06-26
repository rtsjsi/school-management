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

## Strict Environment Boundaries
**CRITICAL RULE:** When operating on a branch other than `main` (such as `development`), you **MUST NOT** connect to, query, or modify the PROD database unless the user explicitly and unambiguously commands you to do so. Always default to querying and interacting with the database that corresponds to the active branch (e.g., DEV database for `development` branch).
