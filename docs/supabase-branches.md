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

A single script **`scripts/by-branch.js`** handles branch-based env and Supabase CLI:

- **`npm run dev`** / **`npm run build`** — Sync env from the current branch into `.env.local`, then run Next.js. The app uses the correct Supabase project for that branch.
- **`npm run db:push`** — Sync env, link the Supabase CLI to the current branch’s project, then push migrations. On `main` this targets production; on `development` (or any other branch) it targets dev.
- **`npm run supabase:link`** — Sync env and link the Supabase CLI to the current branch’s project (no other command). Useful after cloning the repo.

No manual linking or env switching is needed; branch name drives everything.
