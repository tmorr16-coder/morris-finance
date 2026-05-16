# morris-finance

Personal finance command center at **finance.morrisai.family**. Plaid + Supabase + Next.js 16.

## Stack

- **Next.js 16 / React 19** — App Router, deployed on Vercel
- **Supabase** — auth (Google OAuth, reused from health.morrisai.family) and Postgres with a dedicated `finance` schema
- **Plaid** — Transactions product, daily cron sync + webhook for real-time updates
- **AES-256-GCM** — application-layer encryption for stored access tokens

## Status

- [x] Phase 1 — Foundation: sign-in, layout, deploy
- [ ] Phase 2 — Schema migration
- [ ] Phase 3 — Plaid connect flow
- [ ] Phase 4 — Daily cron sync
- [ ] Phase 5 — Webhook
- [ ] Phase 6 — UI build-out
- [ ] Phase 7 — AI insights
- [ ] Phase 8 — Production Plaid access
