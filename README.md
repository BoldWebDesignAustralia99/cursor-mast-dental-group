# Mast Dental Group Platform

A dental-implant patient-booking platform for sales teams, clinic partners, and internal operations. Built with Vite + React + TypeScript + Tailwind + shadcn/ui on the frontend, and Supabase (Postgres, Auth, Storage, Edge Functions, Realtime) on the backend.

## Phase 1 — Foundation (current)

This phase delivers the application shell and security foundation that every later module builds on:

- **Authentication** — magic-link sign-in via Supabase Auth
- **Roles** — all seven user types from the spec (super_admin through clinic_staff)
- **Permissions** — feature registry, role defaults, user overrides, enforced via Postgres RLS
- **Settings framework** — admin-editable business rules stored in the database
- **App shell** — collapsible sidebar, top bar, ⌘K search, light/dark theme toggle, mobile bottom tabs
- **Activities audit stream** — foundation table for system events
- **Vercel deployment** — SPA routing configured

Later phases (clinics, bookings, leads, telephony, AI, training, etc.) are stubbed with placeholder pages.

---

## Quick start (developers)

```bash
npm install
cp .env.example .env.local   # add your Supabase URL + anon key
npm run dev
```

Open http://localhost:5173

**Without Supabase configured:** click **Continue to demo** on the login page to explore the UI shell with a demo super-admin profile.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy project URL and anon key into `.env.local`
3. Apply migrations:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

4. Create your first super-admin user in Supabase Auth, then update their role:

```sql
UPDATE staff_profiles SET role = 'super_admin' WHERE email = 'you@company.com';
```

---

## Deploy to Vercel

1. Import this repository in Vercel
2. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy — preview URLs are generated automatically for each branch

---

## Phase 1 verification checklist (for owner sign-off)

Use this list to confirm Phase 1 works. No technical knowledge required.

### Login and navigation

- [ ] Open the app URL — you see a clean login page titled **Mast Dental Group**
- [ ] Enter your work email and click **Send sign-in link** — you receive an email (requires Supabase configured)
- [ ] After signing in, you land on the **Dashboard**
- [ ] The left sidebar shows menu sections appropriate to your role
- [ ] Click the **☰** (collapse) button — the sidebar shrinks to icons only
- [ ] Press **⌘K** (Mac) or **Ctrl+K** (Windows) — a search dialog opens; pick a page and you navigate there
- [ ] On a phone or narrow browser window, a bottom tab bar appears with your four most-used sections

### Theme

- [ ] Click the theme icon in the top bar — switch between Light, Dark, and System
- [ ] Refresh the page — your theme choice is remembered
- [ ] Go to **Profile** — change theme from the dropdown there too

### Permissions (super_admin only)

- [ ] Open **Permissions** from the sidebar
- [ ] Select **Sales rep** tab — see a list of features with on/off toggles
- [ ] Turn off **View leads** for sales rep — save succeeds with a confirmation toast
- [ ] Sign in as a sales rep (or ask one to try) — they can no longer access Leads (even if they type the URL directly)

### Settings (admin / super_admin)

- [ ] Open **Settings** from the sidebar
- [ ] See tabs for categories like **General**, **Bookings**, **Billing**, **Leads**
- [ ] Change **Low balance threshold** to a new number and click **Save change** — toast confirms save
- [ ] Refresh — the new value is still there (stored in database, not code)

### Placeholder pages

- [ ] Click **Call queue**, **Leads**, **Bookings**, **Clinic CRM** — each shows a "coming soon" message (built in later phases)

### Mobile

- [ ] On your phone, tap targets feel comfortable (buttons are easy to press)
- [ ] Bottom tab bar works for quick navigation

---

## Project structure

```
src/
  components/   UI components (shadcn) and layout shell
  hooks/        React Query hooks for auth, permissions, settings
  pages/        Route pages
  providers/    Auth, theme, React Query
  lib/          Utilities, navigation config, constants
  types/        TypeScript database types
supabase/
  migrations/   Postgres schema (feature-scoped)
```

---

## Build order (full spec)

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Foundation: auth, permissions, settings, app shell | **Complete** |
| 2 | Clinics, availability engine, portal calendar | Planned |
| 3 | Bookings, classification, deposits, reminders, PMS | Planned |
| 4 | Leads, routing matrix, call queue, callbacks | Planned |
| 5 | Telephony, SMS, transcription, AI notes | Planned |
| 6 | Clinic CRM, proposals, credits, GoCardless, invoicing | Planned |
| 7 | AI layer: grading, coaching, copilot, admin chat | Planned |
| 8 | Training journeys + Team & HR | Planned |
| 9 | Data migration, cron jobs, webhook cutover | Planned |

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run lint` | ESLint |

---

## License

Proprietary — Bold Web Design Australia / Mast Dental Group
