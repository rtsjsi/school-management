# School Management

School management app built with **Next.js 14** (React), **Supabase** (database & auth), and deployed on **Vercel**.

## Running the app

The same codebase runs **locally** and on **Vercel**; only environment variables change.

| Where    | How to run |
|----------|------------|
| **Local** | `npm install` then `npm run dev` → [http://localhost:3000](http://localhost:3000). Use `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| **Local (production build)** | `npm run build` then `npm run start` → same as Vercel runtime. |
| **Vercel** | Push to `main` (or your connected branch). Set the same env vars in Vercel → **Settings → Environment Variables**. |

Use the **same Supabase project** for both so data and auth are shared.

## Stack

- **React** – UI (Next.js App Router)
- **Node.js** – Server (Next.js API routes / server components)
- **Supabase** – Database, auth, realtime
- **Vercel** – Hosting

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy env and add your Supabase keys:

   ```bash
   cp .env.example .env.local
   ```

   In [Supabase](https://supabase.com) → Project Settings → API set:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (required for correct role-based access; server-only, never expose to client)

3. **Database & roles** – apply the migration using either **Option A (Dashboard)** or **Option B (CLI)** below.  
   After the migration, new users get role `teacher` by default. To make your first user a Super Admin, run in SQL Editor:  
   `UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';`

   **Option A – Supabase Dashboard (no CLI)**  
   - Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.  
   - Copy the full contents of `supabase/migrations/20240213000000_create_profiles_and_roles.sql`.  
   - Paste into the editor and click **Run**.

   **Option B – Supabase CLI (link project and push migrations)**  
   See [Supabase CLI: link and push](#supabase-cli-link-and-push) below.

4. Run dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` – Development server
- `npm run build` – Production build
- `npm run start` – Run production build
- `npm run lint` – Run ESLint
- `npm run db:push` – Apply migrations in `supabase/migrations/` to the linked Supabase project (run after adding new migrations)

## Deploy on Vercel

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Add env vars in Vercel (same as `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.

---

## Supabase CLI: link and push

Use this to link your local repo to your hosted Supabase project and push migrations from the terminal.

### 1. Install the Supabase CLI

**Windows (PowerShell):**

```powershell
# Using Scoop (install from https://scoop.sh if needed)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or using npm (global)
npm install -g supabase
```

**macOS / Linux:**

```bash
# Homebrew (macOS/Linux)
brew install supabase/tap/supabase

# Or npm
npm install -g supabase
```

Check it works:

```bash
supabase --version
```

### 2. Log in to Supabase

From your project root:

```bash
supabase login
```

A browser window opens; sign in with your Supabase account. This stores a token so the CLI can talk to your projects.

### 3. Get your project reference ID

- Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
- Look at the URL: `https://supabase.com/dashboard/project/<project-ref>`.
- The **project ref** is the `<project-ref>` part (e.g. `abcdefghijklmnop`).

You can also find it under **Project Settings → General → Reference ID**.

### 4. Initialize Supabase in the repo (if needed)

If the `supabase` folder doesn’t have a `config.toml` yet, run:

```bash
supabase init
```

This creates `supabase/config.toml`. If you already have `supabase/migrations/` and only need to link/push, you can skip this and go to step 5.

### 5. Link the local project to your remote Supabase project

Replace `<project-ref>` with your actual project ref from step 3:

```bash
supabase link --project-ref <project-ref>
```

Example:

```bash
supabase link --project-ref abcdefghijklmnop
```

When prompted:

- **Database password:** use the database password you set when creating the project (or reset it under **Project Settings → Database**).

Linking stores the project ref in `.supabase` (and optionally in `config.toml`). Don’t commit `.supabase` if it contains secrets; it’s usually in `.gitignore`.

### 6. Push migrations to the remote database

Apply all migrations in `supabase/migrations/` to the linked project:

```bash
supabase db push
```

The CLI will apply any migrations that haven’t been applied yet (e.g. `20240213000000_create_profiles_and_roles.sql`). You should see a success message.

### 7. Verify

- In the Dashboard, go to **Table Editor** and confirm the `profiles` table exists.
- Optionally run **SQL Editor**:  
  `SELECT * FROM profiles;`  
  (it may be empty until users sign up.)

### Troubleshooting

| Issue | What to do |
|-------|------------|
| **“command not found: supabase”** | Install the CLI (step 1) and ensure it’s on your PATH. |
| **“Invalid API key” or login errors** | Run `supabase login` again and complete the browser flow. |
| **“Database password” rejected** | Use the project’s database password from **Project Settings → Database**. Reset the password there if needed. |
| **“Permission denied” on `db push`** | Your DB user must be allowed to run DDL. Use the project’s database password; avoid custom DB roles that restrict schema changes. |
| **Migration already applied** | If the migration was applied via the Dashboard (Option A), the CLI may report that there’s nothing to push. That’s expected. |
| **Link again after clone** | On a new machine or clone, run `supabase link --project-ref <project-ref>` again and then `supabase db push` if needed. |

### Optional: use environment variables (e.g. for CI)

For non-interactive use you can pass:

- `SUPABASE_ACCESS_TOKEN` – from [Account → Access Tokens](https://supabase.com/dashboard/account/tokens).
- `SUPABASE_DB_PASSWORD` – project database password.

Example (don’t commit real values):

```bash
set SUPABASE_ACCESS_TOKEN=your_token
set SUPABASE_DB_PASSWORD=your_db_password
supabase link --project-ref <project-ref>
supabase db push
```
