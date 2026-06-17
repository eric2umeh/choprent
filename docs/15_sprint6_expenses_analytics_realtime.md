# Sprint 6 — Expenses, analytics, realtime dashboard

**Goal:** Landlords track property costs against rent collected, get rule-based rent renewal guidance, and see dashboard stats update live when payments change.

**Depends on:** Sprint 3 ledger/payments (`12_sprint3_payments_arrears.md`), Sprint 5 exports (`14_sprint5_verification_settlement.md`).

---

## Deliverables

| # | Feature | Roles |
|---|---------|-------|
| 1 | **Property expenses** — add, edit, delete with categories | Owner, manager |
| 2 | **P&amp;L summary** — revenue vs expenses by property and portfolio | Owner, manager |
| 3 | **Portfolio analytics** — collection rate, occupancy, arrears by unit type | Owner, manager |
| 4 | **Rent increase advisor** — renewal-window suggestions from collection + arrears | Owner, manager |
| 5 | **Realtime dashboard** — auto-refresh on payment, unit, expense changes | All staff |

---

## Setup

```bash
supabase db push   # applies 20260617100000_sprint6_expenses.sql
npm run dev
```

---

## Manual test flow

1. **Landlord** → `/d/{orgSlug}/expenses` → **Add expense** (diesel, security, etc.) → see P&amp;L cards update
2. **Edit / delete** an expense via row actions
3. **Analytics** → `/d/{orgSlug}/analytics` — check collection rate, rent advisor cards for leases nearing end date
4. **Dashboard** — verify a payment in another tab → dashboard pending count refreshes without manual reload
5. **Agent** — Expenses and Analytics hidden from nav (unchanged)

---

## Key files

| Area | Path |
|------|------|
| Migration | `supabase/migrations/20260617100000_sprint6_expenses.sql` |
| Expenses CRUD | `lib/actions/expenses.ts`, `lib/data/expenses.ts` |
| Expenses UI | `components/expenses/expenses-page-client.tsx`, `expense-form.tsx` |
| Analytics | `lib/data/analytics.ts`, `components/analytics/analytics-page-client.tsx` |
| Realtime | `components/dashboard/dashboard-live-sync.tsx`, `app/d/[orgSlug]/page.tsx` |

---

## Out of scope (Sprint 7+)

- Client-side receipt OCR (Tesseract)
- Automated reminder rules / WhatsApp
- Paystack DVA (Sprint 8)
- External market rent benchmarks API

---

## Verify

```bash
cd apps/web && npm run typecheck && npm run build
```
