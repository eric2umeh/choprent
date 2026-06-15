# Sprint 3 — Arrears, partial payments, cash & transfer flows

**Goal:** Replace mock payments/ledger with real Supabase data. Tenants can submit bank transfers (with receipt). Staff can record cash and verify the queue. Partial payments allocate **oldest arrears first**, then current period charges.

**Depends on (built in this sprint):** minimal charge templates + ledger periods for pilot plaza (Sprint 2 slice).

---

## Prerequisites

- Sprint 1 complete: auth, memberships, units CRUD
- Migrations pushed: `supabase db push`
- `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local` (allocation runs server-side)

---

## Deliverables

| # | Feature | Owner roles |
|---|---------|-------------|
| 1 | Pilot charge template (annual shop rent) + ledger period/lines | System seed |
| 2 | Active lease on unit **14** (pilot tenant when linked) | Manager |
| 3 | Unit **16** carries opening arrears | Seed |
| 4 | Tenant submits **bank transfer** + receipt upload → `pending` | Tenant |
| 5 | Manager records **cash** → `verified` + auto-allocate | Manager |
| 6 | Staff **verify / reject** pending payments | Owner, manager, agent |
| 7 | **Partial allocation** — oldest arrears → open ledger periods | Server |
| 8 | Staff payments list + tenant ledger from Supabase | All |

**Out of scope (Sprint 4+):** lease CRUD UI, renewals, PDF statements, OCR, DVA (Sprint 8).

---

## Allocation rule (locked)

1. Reduce `units.arrears_balance_ngn` (oldest debt bucket)
2. Apply remainder to **open** `ledger_periods` ordered by `period_start` ASC
3. Unallocated surplus stored in `payments.metadata.unallocated_credit_ngn`

See `public.allocate_payment(payment_id)` in migration `20260615100000_sprint3_pilot_ledger_payments.sql`.

---

## Setup

```bash
supabase db push
npm run dev
```

### Seed data (pilot plaza)

| Unit | Notes |
|------|--------|
| 14 | Active lease, 2026 annual ledger (~₦1.2M expected) |
| 16 | `arrears_balance_ngn` = ₦450,000 opening arrears |
| — | Sample pending transfer on unit 14 (optional) |

### Manual test flow

1. **Staff** → `/d/pilot-plaza/payments` — see pending list from DB
2. **Verify** a pending payment → status `verified`, allocations created
3. **Record cash** → new verified payment + allocation
4. **Tenant** (after lease linked to auth user) → `/t/pilot-plaza/pay` — upload receipt → pending
5. **Tenant ledger** → `/t/pilot-plaza/ledger` — lines from `ledger_lines` + payments

### Link a tenant login to unit 14

```sql
update leases
set tenant_user_id = (select id from auth.users where email = 'tenant@example.com')
where unit_id = '44444444-4444-4444-4444-444444444401'
  and status = 'active';
```

---

## Key files

| Area | Path |
|------|------|
| Migration | `supabase/migrations/20260615100000_sprint3_pilot_ledger_payments.sql` |
| Allocation | `apps/web/src/lib/charges/allocate-payment.ts` |
| Data | `apps/web/src/lib/data/payments.ts`, `ledger.ts` |
| Actions | `apps/web/src/lib/actions/payments.ts`, `tenant-payments.ts` |
| UI | `payments-list.tsx`, `tenant pay`, `tenant-ledger-list.tsx` |

---

## Verify

```bash
cd apps/web && npm run typecheck && npm run build
```

---

## Next sprint (Sprint 4)

Tenant portal polish: PDF statements, management letters, receipt OCR pre-fill, lease create/renew UI.
