# School Management

School management app built with **Next.js 14** (React), **Supabase** (database & auth), and deployed on **Vercel**.

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

   In [Supabase](https://supabase.com) → Project Settings → API: use **Project URL** and **anon public** key.

3. Run dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` – Development server
- `npm run build` – Production build
- `npm run start` – Run production build
- `npm run lint` – Run ESLint

## Deploy on Vercel

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Add env vars in Vercel (same as `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.
