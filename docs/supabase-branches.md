# Supabase branch-based setup

The app and Supabase CLI use different Supabase projects by Git branch:

- **main** → production project `lmevpzxbwojrzfxtxxgy`
- **development** (and any other branch) → dev project `cvbnrkdimglcthtusomw`

No manual linking or env switching is required; the current branch controls which project is used.

## One-time setup

1. **Create branch env files**

   Copy `.env.example` to two files:

   - `.env.main` — for the **main** branch (production)
   - `.env.development` — for the **development** branch (and other branches)

2. **Fill in Supabase keys**

   In the [Supabase dashboard](https://supabase.com/dashboard):

   - **Production** ([project lmevpzxbwojrzfxtxxgy](https://supabase.com/dashboard/project/lmevpzxbwojrzfxtxxgy)): copy **Project URL**, **anon public** key, and **service_role** key into `.env.main`.
   - **Development** ([project cvbnrkdimglcthtusomw](https://supabase.com/dashboard/project/cvbnrkdimglcthtusomw)): copy the same into `.env.development`.

   Both files are in `.gitignore` and must never be committed.

## Usage

- **`npm run dev`** / **`npm run build`** — Sync env from the current branch (`.env.main` or `.env.development`) into `.env.local`, then run Next.js. The app uses the correct Supabase project for that branch.
- **`npm run db:push`** — Link the Supabase CLI to the project for the current branch, then push migrations. On `main` this targets production; on `development` (or any other branch) it targets dev.
- **`npm run supabase:link`** — Link only (no command). Useful after cloning to set the correct project for your current branch.

No manual linking or env switching is needed; branch name drives everything.

## Syncing users from production to development

To copy all application users (auth + profiles with role/full_name) from the main DB to the dev DB:

1. **Use your existing env files** — The script reads **.env.main** for PROD and **.env.development** for DEV (same as the branch-based setup). Ensure both files exist with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

2. **Run the script:**
   ```bash
   npm run sync-users:prod-to-dev
   ```
   - New users are created in dev with a **temporary password**; existing dev users get their profile (role, full_name) updated from prod.
   - New-user passwords are printed to the console only (no file is kept). Copy them before the script exits. Any existing `sync-users-passwords.csv` from a previous run is removed after a successful run.
