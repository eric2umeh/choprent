# ChopRent

Mobile-first rent collection and plaza management for Nigerian landlords, managers, and tenants.

**Stack:** Next.js · Supabase · Vercel · Paystack DVA (Phase 1.5)

## Quick start

```bash
cp .env.example apps/web/.env.local   # add Supabase keys
npm install
npm run dev                           # http://localhost:3000
```

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

See **[docs/07_supabase_setup.md](docs/07_supabase_setup.md)** — you do **not** paste SQL manually; CLI applies `supabase/migrations/` in order.

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/00_project_summary.md](docs/00_project_summary.md) | MVP scope, phases, sprints |
| [docs/01_architecture.md](docs/01_architecture.md) | Schema, DVA, utilities, realtime |
| [docs/01_LOI_pilot_agreement_draft.md](docs/01_LOI_pilot_agreement_draft.md) | Commercial / pilot terms |
| [docs/02_metrics_tracking_checklist.md](docs/02_metrics_tracking_checklist.md) | Monthly OC3 evidence |
| [docs/03_decisions_log.md](docs/03_decisions_log.md) | Locked product decisions |
| [docs/04_privacy_ndpr.md](docs/04_privacy_ndpr.md) | Privacy & NDPR checklist |
| [docs/06_competitive_positioning.md](docs/06_competitive_positioning.md) | vs PayRent; unique OC3 differentiators |
| [docs/07_supabase_setup.md](docs/07_supabase_setup.md) | Cloud setup; how migrations work |
| [docs/08_sprint1_auth_setup.md](docs/08_sprint1_auth_setup.md) | Sprint 1 auth, roles, password login |
| [docs/09_web_app_setup.md](docs/09_web_app_setup.md) | Web app local dev |
| [docs/11_security_env_and_git.md](docs/11_security_env_and_git.md) | Env files, leaked keys, git cleanup |

## Repo

https://github.com/eric2umeh/choprent

## Sprint 0 (this scaffold)

- [x] Monorepo root + Next.js 15 app (`apps/web`)
- [x] Supabase schema v1, RLS, storage buckets, seed
- [x] Supabase SSR clients + middleware
- [x] ChopRent mobile-first landing page
- [ ] Link Supabase project + push migrations (you)
- [ ] Deploy preview on Vercel (Sprint 0 finish)
