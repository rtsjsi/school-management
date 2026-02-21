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
