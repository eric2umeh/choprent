# Sprint 7 — Tenant activity reports, PWA, OCR & reminders

**Goal:** Instrument tenant self-service activity, fix live dashboard data, add installable PWA for tenants, and begin receipt OCR + rent reminders.

**Depends on:** Sprint 6 (`15_sprint6_expenses_analytics_realtime.md`).

---

## Deliverables

| # | Feature | Status |
|---|---------|--------|
| 1 | **Reports page** — self-service activity table, exports, DB snapshots | ✓ |
| 2 | **Tenant engagement events** — receipt, ledger view, document download | ✓ |
| 3 | **Dashboard stats fix** — admin client for accurate collected/arrears | ✓ |
| 4 | **PWA manifest + Add to Home Screen** prompt on tenant portal | ✓ |
| 5 | **Receipt OCR pre-fill** (Tesseract.js) | Next |
| 6 | **Arrears reminder rules** (email + in-app) | Next |

---

## Setup

```bash
supabase db push   # 20260620100000_sprint7_tenant_engagement.sql
npm run dev
```

---

## Monthly reports workflow

1. **Landlord** → `/d/{orgSlug}/reports` (nav: **Reports**)
2. Review **Tenant self-service activity** table (receipt / ledger / documents)
3. Click **Download report pack** → downloads JSON + CSV for your monthly reports folder
4. Click **Save snapshot** → stores dated row in the database
5. Screenshot dashboard + tenant mobile pay flow for monthly archive

### What counts as self-serving

A tenant qualifies if they have **any** of:

- Uploaded a transfer receipt (tenant pay flow)
- Viewed ledger (logged once per session)
- Downloaded a statement or letter
- Paid via DVA (Sprint 8)

---

## Manual test flow

1. **Dashboard** — verify Collected, Outstanding, Occupied show real numbers (not zeros)
2. **Tenant** → Pay → upload receipt → check Reports page shows receipt = Yes
3. **Tenant** → Ledger → check Reports shows ledger = Yes
4. **Tenant** → Documents → download → check Reports shows documents = Yes
5. **Reports** → Save snapshot → appears under Saved snapshots
6. **Tenant mobile** → see Add to Home Screen banner (iOS: Share instructions)

---

## Key files

| Area | Path |
|------|------|
| Migration | `supabase/migrations/20260620100000_sprint7_tenant_engagement.sql` |
| Activity data | `lib/data/tenant-activity.ts`, `lib/actions/reports.ts` |
| Reports UI | `components/reports/reports-page-client.tsx` |
| Engagement | `components/reports/tenant-engagement-beacon.tsx` |
| Dashboard fix | `lib/data/dashboard-stats.ts` |
| PWA | `app/manifest.ts`, `components/pwa/add-to-home-screen.tsx` |

---

## Out of scope (Sprint 8+)

- Paystack DVA + webhooks
- WhatsApp reminders
- External rent benchmark API

---

## Verify

```bash
cd apps/web && npx tsc --noEmit
```
