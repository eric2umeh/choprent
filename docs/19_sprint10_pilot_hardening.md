# Sprint 10 — Production pilot hardening

**Goal:** Get the first live plaza onboarded with a guided setup flow, production checks, and bug fixes from pilot testing.

---

## Deliverables

| # | Feature | Status |
|---|---------|--------|
| 1 | **Pilot setup checklist** on landlord dashboard (6 steps + optional team invite) | ✓ |
| 2 | **Landlord onboarding** — workspace name on sign-up | ✓ |
| 3 | **Reopen checklist** from Settings | ✓ |
| 4 | Payment notes visible in verification queue (column + metadata) | ✓ |
| 5 | Health check `GET /api/health` | ✓ |
| 6 | Marketing contact footer (`choprent.tech@gmail.com`, `+234 818 032 9799`) | ✓ |

---

## Pilot setup checklist

Shown on **Dashboard** for landlords until all required steps are done or dismissed.

| Step | What to do |
|------|------------|
| 1 | Settings → company profile |
| 2 | Properties → add plaza |
| 3 | Add units inside property |
| 4 | Account → settlement bank account |
| 5 | Unit edit → tenant + rent + cadence |
| 6 | Payments → verify or record cash |
| 7 | Users → invite manager (optional) |

Dismiss with **×**; reopen from **Settings → Pilot setup guide**.

---

## New landlord flow

1. Sign up at `/login`
2. `/access-pending` → choose **Landlord**, enter workspace name
3. Dashboard shows **Pilot setup** checklist
4. Follow steps until first verified payment

Managers/agents: sign up → choose role → landlord invites by email from **Users**.

---

## Production checks

```bash
# Migrations (Sprint 9 + 10 use existing schema — settings JSON only)
supabase db push

# Health
curl https://YOUR_DOMAIN/api/health

# Env (Vercel)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CONTACT_EMAIL=choprent.tech@gmail.com
NEXT_PUBLIC_CONTACT_PHONE=+2348180329799
```

---

## Manual test

1. New landlord account → workspace name → dashboard checklist appears
2. Complete profile → step 1 ticks
3. Add property + unit + bank account + tenant → steps tick
4. Tenant uploads receipt → verify → step 6 ticks
5. Dismiss checklist → gone; Settings → Show on dashboard → returns

---

## Key files

| Area | Path |
|------|------|
| Onboarding status | `lib/data/pilot-onboarding.ts` |
| Checklist UI | `components/onboarding/pilot-setup-checklist.tsx` |
| Actions | `lib/actions/onboarding.ts` |
| Sign-up | `components/auth/complete-setup-form.tsx` |
| Health | `app/api/health/route.ts` |

---

## Next (Sprint 11)

- Late fees automation
- Paystack DVA when licensed (`ENABLE_PAYSTACK_DVA=true`)
- WhatsApp reminders (paused)
