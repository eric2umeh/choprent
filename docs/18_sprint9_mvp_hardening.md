# Sprint 9 — MVP hardening (complete)

**Goal:** Close Phase 1 MVP gaps — payment UX, notifications, **full charge engine**, and **rent FAQ**. WhatsApp and electricity metering are **paused**.

---

## Deliverables

| # | Feature | Status |
|---|---------|--------|
| 1 | Payment UX — notes, multi-receipt, balance breakdown, searchable units | ✓ |
| 2 | Staff notifications + sound + landlord unverify | ✓ |
| 3 | **Full charge engine** — rent, service %, agency, VAT; monthly/quarterly/annual | ✓ |
| 4 | **Rent FAQ chatbot** — keyword bot on tenant Help tab | ✓ |
| 5 | Late fees automation | Deferred (Sprint 10) |
| 6 | WhatsApp reminders | Paused |
| 7 | Electricity / meters | Paused (Phase 2) |

---

## Migrations

```bash
supabase db push
# 20260623100000_payment_enhancements.sql
# 20260624100000_sprint9_charge_engine.sql
```

---

## Charge engine

Configure on **Unit edit → Tenant & billing**:

| Field | Behaviour |
|-------|-----------|
| Annual rent | Base rent; split by cadence (÷12 monthly, ÷4 quarterly) |
| Billing cadence | Annual, quarterly, or monthly ledger periods within lease dates |
| Service % | Percent of period rent (includes security & shared plaza costs) |
| Agency fee | Annual fixed, prorated per period |
| VAT % | Percent of rent + service + agency |

Saving the unit regenerates `charge_templates`, `ledger_periods`, and `ledger_lines` for the active lease (preserves `paid_total_ngn` on existing periods).

**Also runs** when creating or renewing a lease if a billing profile exists on the unit.

---

## Rent FAQ

- Tenant → **Help** tab or Home → **Rent help**
- Keyword matching — no external AI API
- Topics: pay rent, receipts, service charge, balance, verification, statements

---

## Manual test

1. Edit unit → set rent ₦1,200,000, service 10%, VAT 7.5%, cadence **quarterly** → save
2. Open tenant ledger → see Q1–Q4 lines with rent + service + VAT
3. Record cash → balance breakdown shows types by year
4. Tenant → Help → ask “How do I pay my rent?”

---

## Key files

| Area | Path |
|------|------|
| Billing profile | `lib/charges/billing-profile.ts` |
| Period ranges | `lib/charges/period-ranges.ts` |
| Generator | `lib/charges/generate-ledger.ts` |
| Unit UI | `components/units/unit-edit-form.tsx` |
| FAQ | `lib/faq/rent-faq.ts`, `components/tenant/tenant-faq-chat.tsx` |
| Migration | `supabase/migrations/20260624100000_sprint9_charge_engine.sql` |
