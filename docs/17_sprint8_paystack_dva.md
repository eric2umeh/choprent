# Sprint 8 — Paystack dedicated virtual accounts (DVA)

**Goal:** Per-unit Paystack DVA for automatic rent collection, webhook matching, and landlord provisioning UI.

**Depends on:** Sprint 7 (`16_sprint7_reports_pwa_ocr.md`).

---

## Deliverables

| # | Feature | Status |
|---|---------|--------|
| 1 | **Paystack client** — customer, DVA assign, signature verify, mock mode | ✓ |
| 2 | **Provision DVA** per unit from Account page | ✓ |
| 3 | **Webhook** `charge.success` → payment + allocation + engagement | ✓ |
| 4 | **Tenant home** — show DVA NUBAN when provisioned | ✓ |
| 5 | **Lease sync** — update DVA account name on new/renewed lease | ✓ |

---

## Setup

```bash
supabase db push   # virtual_accounts from init schema; reminder_rules migration if not applied
```

### Environment

```bash
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Without `PAYSTACK_SECRET_KEY`, Account → Paystack DVA provisions **mock** NUBANs for local testing.

### Paystack dashboard

1. Enable **Dedicated Virtual Accounts** on your Paystack account.
2. Webhook URL: `https://YOUR_DOMAIN/api/webhooks/paystack`
3. Subscribe to `charge.success`.

---

## Manual test flow

1. **Landlord** → Account → Paystack DVA → **Provision** for a unit (mock or live).
2. **Tenant** → Home → see **Pay to your shop account (DVA)** with NUBAN.
3. Transfer to NUBAN (live) or simulate webhook POST with valid signature.
4. **Payments** → row appears as `dedicated_account` / `auto_matched`.
5. **Reports** → tenant counts as self-served (DVA payment).
6. **Create/renew lease** → DVA account name updates to tenant display name.

### Mock webhook (dev)

Use Paystack test mode or inspect `lib/paystack/client.ts` mock paths when keys are unset.

---

## Key files

| Area | Path |
|------|------|
| Client | `lib/paystack/client.ts` |
| Provision | `lib/paystack/provision-unit-dva.ts`, `lib/actions/virtual-accounts.ts` |
| Webhook | `app/api/webhooks/paystack/route.ts` |
| UI | `components/account/dva-panel.tsx`, `app/d/[orgSlug]/account/page.tsx` |
| Tenant display | `lib/data/tenant-home.ts`, `app/t/[orgSlug]/page.tsx` |
| Lease sync | `lib/actions/leases.ts` |

---

## Out of scope

- Split settlements / multi-bank routing
- Partial payment allocation rules beyond existing ledger logic
- WhatsApp payment confirmations

---

## Verify

```bash
cd apps/web && npm run typecheck
```
