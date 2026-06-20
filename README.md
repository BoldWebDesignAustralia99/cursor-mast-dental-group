# Mast Dental Group — Full Platform

Enterprise dental-implant booking platform per complete specification.

## Quick start

### Live demo (easiest)

**GitHub Pages:** https://boldwebdesignaustralia99.github.io/cursor-mast-dental-group/

1. Open the link above
2. Click **Continue to demo** on the login page
3. Explore the full UI (no Supabase required)

> If the link shows 404, enable Pages once: GitHub repo → **Settings** → **Pages** → Source: **GitHub Actions**, then re-run the **Deploy demo site to GitHub Pages** workflow.

### Run locally

```bash
npm install && npm run dev
```

Open **http://localhost:5173** → Login → **Continue to demo**.

**Demo:** Login → Continue to demo → focused sales lead page (Raewyn Mitchell).

**Production:** Configure Supabase + deploy Edge Functions + set integration secrets.

---

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Vite, React 19, TypeScript, Tailwind 4, shadcn/ui |
| Backend | Supabase Postgres, Auth, RLS, Realtime, Edge Functions |
| Deploy | Vercel (frontend), Supabase (backend) |

---

## Modules (spec coverage)

### Built — UI + database + Edge Functions

- **Start Work + lead locking** — one-click allocation (`start_work` RPC), heartbeat locks, no queue browsing for reps
- **Dual queues** — frontline + reactivation pools with separate pods
- **Call Screen** — 7-stage framework, mouth map, finance check, deposit, booking; Dark Command Center theme
- **Job queue + domain events** — durable async backbone for workflows/comms at scale
- **Settings** — all business rules in `app_settings` table
- **Sales lead page** — focused 3-column call view with copilot panel
- **Call queue & leads** — paginated RPCs, callbacks priority
- **Bookings** — create via RPC, detail with classification + deposit links
- **Clinic CRM** — list, pipeline kanban, detail, timeline, proposals/onboarding tabs
- **Routing matrix** — zones × clinics view
- **Comms inbox** — clinic messages with AI draft
- **Availability engine** — weekly hours, overrides, slot RPCs, overlap constraint
- **Classification** — Edge Function + review queue table
- **Credits** — ledger, packages, GoCardless webhook handler
- **Notifications** — emit engine, preferences, paginated feed
- **AI layer** — shared module; call notes, coaching, admin chat, clinic reply, classification
- **Training** — journey progress, builder UI, grading review
- **Team & HR** — timesheets, leave, payroll, messages, community, leaderboard stub
- **Clinic portal** — bookings, calendar, credits
- **Admin** — integrations registry, performance dashboard, AI chat
- **Cron jobs** — stale callbacks, capacity cache, paused clinic reassignment
- **Webhooks** — Facebook, Make.com, Stripe, GoCardless (documented in `docs/webhook-contracts.md`)

### Requires API keys to go live

Twilio WebRTC in browser, Deepgram streaming, ElevenLabs practice calls, Mapbox maps, Xero OAuth, Praktika PMS sync — Edge Function stubs and DB tables exist; connect credentials in Supabase secrets.

### Phase 9 (cutover)

Data migration from existing production DB, two-week parallel run — not applicable until production credentials and source DB are provided.

---

## Supabase

**Project:** Mast Dental Platform USA (`dqgbtujrnzmzvqijncsj`) · Region: `us-east-1`

```bash
# Copy .env.example and add your publishable key from Supabase dashboard
cp .env.example .env.local

npx supabase link --project-ref dqgbtujrnzmzvqijncsj
npx supabase db push
npx supabase functions deploy
```

Set secrets: `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `TWILIO_*`, `GOCARDLESS_*`, etc.

### Schema (62 tables)

Foundation migrations + **Start Work / lead locking / sales pods / job queue / domain events** (migration `20250620000008`).

Key RPCs: `start_work`, `acquire_lead_lock`, `heartbeat_lead_lock`, `release_lead_lock`, `enqueue_job`, `emit_domain_event`.

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `classify-booking` | AI classification from transcript |
| `ai-call-notes` | Post-call summary + disposition |
| `process-coaching` | Daily rep coaching job |
| `create-deposit-link` | Stripe Checkout + SMS |
| `ai-clinic-reply` | Draft clinic message replies |
| `ai-admin-chat` | Internal data assistant |
| `webhook-facebook-leads` | Facebook Lead Ads |
| `webhook-make` | Make.com patient + clinic leads |
| `webhook-stripe` | Deposit confirmation |
| `webhook-gocardless` | Credit purchase payments |
| `send-reminders` | Booking SMS/email reminders |

---

## Scripts

`npm run dev` · `npm run build` · `npm run test` · `npm run lint`
