# AGENTS.md

## Cursor Cloud specific instructions

### Repository state

The `main` branch is currently a scaffold (only `README.md`). The actual product — an
enterprise dental-implant booking platform called **Mast Dental Group / `dental-app`** — was
developed on feature branches (e.g. `cursor/full-platform-build-756b`) and may not yet be merged
into `main`. If `main` has no `package.json`, there is nothing to install or run from `main`;
check the open feature branches/PRs for the application code.

### Stack & how to run (once app code is present at the repo root)

- Frontend SPA: Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui, backed by Supabase
  (Postgres/Auth/Edge Functions). Package manager is **npm** (`package-lock.json`).
- Commands (from the directory containing `package.json`):
  - `npm install` — install deps (the startup update script runs this automatically when a
    root `package.json`/`package-lock.json` exists).
  - `npm run dev` — Vite dev server on `http://localhost:5173/`.
  - `npm run lint` — ESLint.
  - `npm test` — Vitest (`vitest run`).
  - `npm run build` — `tsc -b && vite build`.

### Non-obvious caveats

- **No credentials needed to demo.** Supabase env vars (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, see `.env.example`) are optional for local dev: `src/lib/supabase.ts`
  falls back to placeholder values. Use the built-in **demo mode** to exercise the UI end-to-end:
  on the login page click **"Continue to demo"**, which loads a sales-lead page (Raewyn Mitchell)
  where you can add call notes, navigate, etc.
- Real Supabase + integration secrets (Stripe, Twilio, Anthropic/OpenAI, GoCardless, etc.) are
  only required for the production backend / Edge Functions, not for frontend dev or tests.
