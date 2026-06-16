# Mast Dental Group Platform

Enterprise dental-implant patient-booking platform for sales teams, clinic partners, and internal operations.

**Stack:** Vite + React + TypeScript + Tailwind + shadcn/ui · Supabase (Postgres, Auth, RLS, Realtime) · Vercel

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — demo mode works without Supabase
npm run dev
```

Open http://localhost:5173 → **Continue to demo** lands you on the **focused sales lead page** (Raewyn Mitchell mockup).

With Supabase configured: magic-link auth, real data, RLS-enforced permissions.

---

## What's built

### Phase 1 — Foundation
Auth, 7 roles, permissions matrix (RLS + UI), settings framework, app shell, theme toggle, ⌘K search

### Phase 2–4 — Clinics, leads, bookings
- **Clinic CRM** list with credit balances and pipeline stages
- **Availability engine** (Postgres RPCs: weekly hours, overrides, slot generation, overlap prevention)
- **Leads** list + **call queue** with server-side pagination
- **Focused lead record page** — the sales rep's main workspace:
  - Call timer, mute/hold/end controls
  - 6-step call flow script stepper
  - Live AI call notes feed
  - Clinic picker with distance, senior badges, recommendations
  - Inline calendar + time slot picker → book appointment
- **Bookings** list with status, outcome, deposit state
- Unified **communications** + **activities** tables

### Phase 5–8 — Team, training, portal, notifications
- Dashboard with live stats (from `dashboard_stats` view)
- Notifications feed (paginated RPC)
- Training journey progress UI
- Team & HR tabs (timesheets, leave, tasks, messages, leaderboard)
- Clinic portal: bookings feed, calendar management, credits/top-ups

### Database
4 feature-scoped migrations in `supabase/migrations/` with seed data (demo clinics, leads, call flow stages).

---

## Sales lead page (focused view)

Route: `/leads/:id`

Designed for reps on active calls — no main sidebar, thin icon rail, three columns:

| Column | Content |
|--------|---------|
| Left | Call flow stepper + lead summary (wants, funding, decision-maker) |
| Center | Current script card + AI/user call notes |
| Right | Clinic selection → calendar → time slots → Book appointment |

---

## Supabase setup

```bash
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

Promote first user:
```sql
UPDATE staff_profiles SET role = 'super_admin' WHERE email = 'you@company.com';
```

---

## Deploy (Vercel)

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. SPA rewrites configured in `vercel.json`.

---

## Verification checklist

### Demo (no backend)
- [ ] Login → **Continue to demo** → focused lead page loads
- [ ] Call flow stepper shows 6 stages; step 6 has the consult value script
- [ ] Moorooka clinic is pre-selected with "Rec" badge
- [ ] Time slots show Dr Evelyn Chin with Senior badge
- [ ] Click **Book appointment** → success toast
- [ ] Icon rail navigates to call queue, dashboard, etc.

### With Supabase
- [ ] Magic-link sign-in works
- [ ] Call queue shows seeded leads
- [ ] Permissions toggle blocks API access (not just UI)
- [ ] Settings changes persist after refresh

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run test` | Unit tests |
| `npm run lint` | ESLint |

---

## Integrations (env placeholders — wire in production)

Twilio, Stripe, GoCardless, Anthropic/OpenAI, Resend, Mapbox, Deepgram, ElevenLabs, Xero, Praktika — keys in `.env.example`. Edge Functions to be added at webhook switchover.
