# Sprint 5 — Verification queue, settlement accounts, exports

**Goal:** Staff verify payments faster with a dedicated queue. Landlords manage multiple bank accounts per property. Metrics CSV exports and dashboard activity feed support OC3 reporting.

**Depends on:** Sprint 3 payments (`12_sprint3_payments_arrears.md`), Sprint 4 tenant portal (`13_sprint4_tenant_documents.md`).

---

## Deliverables

| # | Feature | Roles |
|---|---------|-------|
| 1 | **Verification queue** — pending-first cards with receipt, verify, reject | Owner, manager, agent |
| 2 | **Multi settlement accounts** — add, edit, delete, default per property | Owner |
| 3 | **Lease settlement picker** — assign rent account when creating lease | Owner, manager |
| 4 | **CSV exports** — payments + units for monthly metrics pack | Owner, manager |
| 5 | **Activity feed** — recent payment events on dashboard | All staff |
| 6 | **Enhanced payment filters** — method filter on all-payments tab | All staff |

---

## Setup

```bash
supabase db push   # no new migrations required for Sprint 5
npm run dev
```

---

## Manual test flow

1. **Tenant** submits transfer with receipt → status `pending`
2. **Staff** → `/d/{orgSlug}/payments` → **Verification queue** tab — verify or reject with receipt preview
3. **Landlord** → `/d/{orgSlug}/account` → Settlement accounts — add second account (e.g. service charge), set default, edit, delete unused
4. **Manager** → `/d/{orgSlug}/tenants` → Assign tenant — pick settlement account for lease
5. **Staff** → `/d/{orgSlug}/reports` → Download payments CSV + units CSV
6. **Dashboard** → see recent activity feed after verifications

---

## Key files

| Area | Path |
|------|------|
| Verification queue | `components/payments/verification-queue.tsx`, `payments-page-client.tsx` |
| Settlement CRUD | `lib/actions/settlement-accounts.ts`, `components/account/settlement-accounts-panel.tsx` |
| Lease account | `components/leases/lease-form.tsx`, `lib/actions/leases.ts` |
| CSV export | `lib/actions/reports.ts`, `components/reports/reports-page-client.tsx` |
| Activity feed | `lib/data/activity-feed.ts`, `app/d/[orgSlug]/page.tsx` |

---

## Out of scope (Sprint 6+)

- Expense tracker + P&amp;L (planned)
- Analytics / rent-increase advisor (planned)
- Realtime subscriptions (Sprint 6)
- Paystack DVA (Sprint 8)

---

## Verify

```bash
cd apps/web && npm run typecheck && npm run build
```
