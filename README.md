# Mast Dental Group — Full Platform

Enterprise dental-implant booking platform per complete specification.

## Quick start

```bash
npm install && npm run dev
```

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

- **Auth & permissions** — 7 roles, RLS, permission matrix, user overrides
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

```bash
npx supabase db push
npx supabase functions deploy
```

Set secrets: `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `TWILIO_*`, `GOCARDLESS_*`, etc.

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
