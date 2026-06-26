# ChopRent — Project Summary

**Repo:** [github.com/eric2umeh/choprent](https://github.com/eric2umeh/choprent)  
**Product:** Multi-property rent collection and plaza management for Nigerian landlords, managers, agents, and tenants.  
**Initial delivery:** Mobile-first responsive web app (Next.js on Vercel, Supabase backend).  
**Pilot framing:** One plaza live first, architecture ready for many landlords.

**Decisions locked:** See [`docs/03_decisions_log.md`](03_decisions_log.md).

---

## Problem

Plaza landlords track rent across shops, flats, and offices using spreadsheets, WhatsApp, and manual bank reconciliation. **Traders** especially will not log into an app monthly — they transfer to a familiar account number. Managers struggle to see arrears, collection rate, and unit-level history in one place.

ChopRent centralizes **plaza → units → leases → charges → payments → verified receipts**, with optional **Paystack dedicated accounts per shop**, real-time dashboards, tenant self-service, and monthly CSV exports.

**Why not “just another rent app”:** See [`06_competitive_positioning.md`](06_competitive_positioning.md) — ChopRent is **plaza / Nigeria / trader-first** (sticky shop NUBAN, verified transfer audit, composite units), not a US card/ACH clone like PayRent.

---

## Users

| Role                 | Primary jobs                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Landlord (owner)** | Full access: portfolio, units, charges, verify payments, reports                                                     |
| **Manager**          | Day-to-day ops: assign tenants, set charges on existing units, verify receipts, issue letters — **cannot add units** |
| **Agent**            | **Assigned plazas only**: verify receipts, record cash — **cannot add units**                                        |
| **Tenant**           | Pay (transfer or DVA), optional upload receipt, view ledger, download statements & management letters                |
| **Platform admin**   | Onboard orgs, support, report exports                                                                                |

Pilot starts with **one landlord / one plaza**; schema is multi-tenant for year-1 expansion.

---

## Phased delivery

### Phase 1 — MVP (build first)

1. Auth: **email + phone** for tenants; manager assigns contact on lease
2. **Plaza → unit** CRUD (**landlord only** for create) with composite unit codes (`14/16`, `14 & 16`)
3. Property types: shop, flat, office, warehouse, kiosk, parking, restaurant, other — **type change history** (e.g. shop → office)
4. **Full leases** with renewal; billing **monthly / quarterly / annual** (annual default)
5. Charge engine: rent + service % (incl. security) + agency fixed + VAT; diesel via **expenses**
6. **Arrears carry forward** year to year; **partial payments** allocated oldest-first
7. **Bank transfer + cash** (manager-recorded); receipt upload → verify queue (landlord/manager/agent)
8. **Multiple settlement bank accounts** per plaza
9. Tenant portal: ledger, receipts, **management letters**, PDF downloads
10. Realtime dashboards + CSV exports (`02_monthly_reports_checklist.md`)
11. **Free/low-cost AI:** client-side OCR (Tesseract) + rule-based arrears reminders

### Phase 1.5 — Trader-friendly collections (high priority)

**Paystack Dedicated Virtual Accounts (DVA)** — one static NUBAN per unit:

- Tenant transfers to shop account **without opening the app**
- On tenant change: update **account display name** only; **account number stays**
- Paystack webhook → auto-create payment → optional auto-verify or manager review
- Fee bearer: **configurable per org** (open decision)

This directly addresses the trader workflow your contact described.

### Phase 2 — Utilities & gateway extras

- **Prepaid electricity / metering:** meter per unit, token purchase, disco API or aggregator partnership, optional margin (legal/commercial review required)
- Optional card/checkout for partial rent payments
- WhatsApp notifications

---

## Payment strategy

| Method                              | When      | Notes                              |
| ----------------------------------- | --------- | ---------------------------------- |
| Bank transfer + receipt             | Phase 1   | Tenant or manager; verify queue    |
| Cash recorded                       | Phase 1   | Manager/agent entry                |
| **Dedicated virtual account (DVA)** | Phase 1.5 | Best for traders; low app friction |
| Card / checkout                     | Phase 2   | Fee bearer TBD; partial payments   |

**Why DVA before card checkout:** Rent is often ₦1M+. Traders already use transfer. DVA gives **auto-reconciliation** without 1.5% on every million. Card checkout remains optional later.

---

## Stack

| Layer      | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| Web        | Next.js 15, TypeScript, Tailwind, shadcn/ui                  |
| Backend    | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) |
| Hosting    | Vercel                                                       |
| Email      | Resend (transactional)                                       |
| Payments   | Paystack DVA + webhooks (Phase 1.5)                          |
| AI (cheap) | Tesseract.js client OCR; template reminders; FAQ keyword bot |
| Privacy    | See `04_privacy_ndpr.md`                                     |

---

## Design direction (distinct from FrontBill)

Clean SaaS aesthetic inspired by [PropertyREM](https://propertyrem.ng/) and [PayRent](https://www.payrent.com/):

- **Primary:** light green `#4ade80` on dark `#0b1220` heroes
- **Font:** Inter (single clean sans-serif)
- **Landing:** dark hero + dashboard preview, white feature sections
- **Login:** split panel (branded left, form right)
- **Dashboard (Sprint 5+):** dark sidebar, green active states, card grid
- Mobile: bottom nav (`Home`, `Units`, `Pay`, `Documents`)

---

## Property model

```
Organization (landlord)
 └── Plaza (name set by landlord)
      └── Unit (Shop 14, 14/16, Flat 3B)
           └── Lease (dates, renewal chain)
                └── Charges + ledger + payments
                     └── Optional: dedicated virtual account (NUBAN)
                     └── Optional (Phase 2): electricity meter
```

---

## Self-serving tenant

Counts toward “tenants self-serving” when tenant account has:

- Uploaded at least one receipt **or** payment received via DVA on their lease
- **Viewed ledger** in app
- **Downloaded** statement or management letter

---

## Build order (updated sprints)

| Sprint | Deliverable                                                       |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------ |
| 0      | Supabase schema v1, RLS, enums, seed                              |
| 1      | Auth (email+phone), org, plaza, unit CRUD, composite unit codes   | ✓ See `08_sprint1_auth_setup.md`                       |
| 2      | Leases + renewals, charge engine, annual/quarterly/monthly ledger | Partial (seed in Sprint 3)                             |
| 3      | Arrears + partial payment allocation, cash + transfer flows       | ✓ See `12_sprint3_payments_arrears.md`                 |
| 4      | Tenant portal, letters, PDF statements, receipt upload            | ✓ See `13_sprint4_tenant_documents.md`                 |
| 5      | Verification queue, multi bank accounts, CSV exports, activity feed | ✓ See `14_sprint5_verification_settlement.md` |
| 6      | Expenses, analytics, Realtime dashboards                          | ✓ See `15_sprint6_expenses_analytics_realtime.md` |
| 7      | Client OCR + reminder rules + mobile polish                       |
| **8**  | **Paystack DVA per unit + webhooks**                              |
| **9**  | **MVP hardening** — charge engine, payment UX, FAQ (meters paused) | See `18_sprint9_mvp_hardening.md` |
| **10** | **Production pilot** — setup checklist, onboarding, bug fixes | See `19_sprint10_pilot_hardening.md` |

---

## Repository layout

```
choprent/
├── apps/web/
├── supabase/migrations/
├── docs/
│   ├── 00_project_summary.md
│   ├── 01_architecture.md
│   ├── 01_LOI_pilot_agreement_draft.md
│   ├── 02_monthly_reports_checklist.md
│   ├── 03_decisions_log.md
│   └── 04_privacy_ndpr.md
└── reports/
```

---

## Next step

Sprint 10: follow [`docs/19_sprint10_pilot_hardening.md`](19_sprint10_pilot_hardening.md) → onboard first live plaza using the dashboard checklist → verify end-to-end rent collection.
