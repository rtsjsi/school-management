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

**Production deployment (e.g. Vercel):** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the main project. Optionally set `SUPABASE_SERVICE_ROLE_KEY` for server-side admin operations (e.g. listing all profiles in Administration). Auth uses the standard flow: profile is read by user id from the `profiles` table.

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

## Development database backup (for manual import into main)

To **create a backup file of the development database** and import it into main yourself:

1. **Set `DEV_DATABASE_URL` in `.env.development`**  
   Supabase Dashboard → Development project → **Connect**.  
   **Use the Session pooler URI** (not the direct database URI): choose **Session** and copy the URI.  
   The direct DB host (`db.xxx.supabase.co`) is IPv6-only on the free tier; the Session pooler host (`aws-0-<region>.pooler.supabase.com:5432`) works over IPv4.
   ```bash
   DEV_DATABASE_URL=postgresql://postgres.[DEV-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
   (Replace region and password as shown in your dashboard.)

2. **Create the backup:**
   ```bash
   npm run db:backup-dev
   ```
   This writes a single SQL file to **`supabase/backups/dev-backup-<timestamp>.sql`** (schema + data for the `public` schema).

3. **Import into main manually:**
   - **Option A:** Supabase Dashboard → **main** project → **SQL Editor** → paste or upload the backup file and run it (after dropping or clearing the `public` schema if you want a full replace).
   - **Option B:** Using `psql` with main’s connection string:  
     `psql "postgresql://..." -f supabase/backups/dev-backup-<timestamp>.sql`

The backup file is in `.gitignore` (`supabase/backups`); keep it local and do not commit it.

---

## Cloning development database into main (automated)

To **flush the main database and restore from dev in one go** (requires both DB URLs and `psql` on PATH):

1. **Install PostgreSQL client** and add **both** `DEV_DATABASE_URL` and `MAIN_DATABASE_URL` to your env files. Use the **Session pooler** URI for each project (free tier needs this for IPv4).

2. **Run:**
   ```bash
   npm run db:clone-dev-to-main
   ```
   This backs up main’s **profiles** (data only), dumps dev’s **public** schema (excluding profiles data), flushes main’s public schema, restores dev’s public data, then restores main’s profiles. **Auth (auth.users) is not touched** — main keeps its own users and profiles, so no sign-in or role issues after clone.

   **Storage:** If `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in both `.env.development` and `.env.main`, the script also copies **all storage buckets** from dev to main: creates missing buckets and copies every object by path. If either env file is missing these, storage copy is skipped.

   **Warning:** This overwrites all main public data except profiles; main’s auth and profiles are preserved.
