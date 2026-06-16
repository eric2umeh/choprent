# Sprint 4 — Tenant portal, letters, PDF statements, leases ✓

**Status:** Complete — see Sprint 5 (`14_sprint5_verification_settlement.md`).

**Goal:** Tenants self-serve (ledger, pay, download docs). Staff issue letters, generate PDF statements, and manage leases from the UI.

**Depends on:** Sprint 3 payments + ledger (`12_sprint3_payments_arrears.md`).

---

## Deliverables

| #   | Feature                                                         | Roles          |
| --- | --------------------------------------------------------------- | -------------- |
| 1   | Tenant home wired to real balance, settlement account, activity | Tenant         |
| 2   | Receipt upload required + staff receipt viewer                  | Tenant, staff  |
| 3   | Documents from `management_documents` + signed downloads        | All            |
| 4   | Staff issue letter/notice (upload to Storage)                   | Owner, manager |
| 5   | Staff generate PDF rent statement per unit                      | Owner, manager |
| 6   | Leases list from DB + assign tenant + renew                     | Owner, manager |

---

## Setup

```bash
supabase db push   # schema already includes management_documents + documents bucket
npm install        # pdf-lib for statements
npm run dev
```

---

## Manual test flow

1. **Staff** → `/d/{orgSlug}/leases` — assign tenant on vacant unit, renew active lease
2. **Staff** → `/d/{orgSlug}/documents` — issue letter PDF, generate statement for a unit
3. **Tenant** (lease linked via `tenant_user_id`) → `/t/{orgSlug}` — balance, bank account, recent activity
4. **Tenant** → `/t/{orgSlug}/pay` — upload receipt (required), submit transfer
5. **Staff** → `/d/{orgSlug}/payments` — view receipt, verify payment
6. **Tenant** → `/t/{orgSlug}/documents` — download issued letters and statements

### Link tenant login to lease

```sql
update leases
set tenant_user_id = (select id from auth.users where email = 'tenant@example.com')
where unit_id = 'YOUR_UNIT_ID' and status = 'active';
```

---

## Key files

| Area           | Path                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| Tenant home    | `apps/web/src/lib/data/tenant-home.ts`, `app/t/[orgSlug]/page.tsx`           |
| Documents      | `lib/data/documents.ts`, `lib/actions/documents.ts`, `components/documents/` |
| PDF statements | `lib/pdf/statement.ts`                                                       |
| Leases         | `lib/data/leases.ts`, `lib/actions/leases.ts`, `components/leases/`          |
| Receipts       | `lib/actions/tenant-payments.ts`, `lib/storage/signed-url.ts`                |

---

## Out of scope (Sprint 5+)

- Verification queue redesign, multi bank accounts (Sprint 5)
- Receipt OCR pre-fill (Sprint 7)
- Paystack DVA (Sprint 8)

---

## Verify

```bash
cd apps/web && npm run typecheck && npm run build
```
