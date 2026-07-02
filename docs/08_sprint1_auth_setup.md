# Sprint 1 — Auth, org access & unit CRUD

**Deliverable:** Supabase Auth (email + phone OTP), protected dashboards, real units from Postgres, landlord unit create.

---

## 1. Apply new migrations

From repo root:

```bash
supabase db push
```

New files:

| Migration | Purpose |
|-----------|---------|
| `20260611100000_pilot_plaza_seed.sql` | Pilot org slug `pilot-plaza`, sample units, unit code normalizer trigger |
| `20260611100001_tenant_org_site_rls.sql` | Tenants with active leases can read org + plaza metadata |

---

## 2. Supabase Auth settings

Dashboard → **Authentication → Providers**:

1. **Email** — enable **Email + password** (recommended for pilot)
2. **Confirm email** — **disable** for pilot (avoids using the 2/hour email quota on sign-up)
3. **Phone** — optional; requires paid SMS provider (Twilio, etc.) — not free
4. **URL configuration** — add redirect URLs (Authentication → URL Configuration):
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback/recovery`
   - `http://localhost:3000/auth/reset-password`
   - `http://localhost:3000/auth/reset-password/verify`
   - `https://YOUR_VERCEL_DOMAIN/auth/reset-password`
   - `https://YOUR_VERCEL_DOMAIN/auth/reset-password/verify`
5. **Rate limits** (Authentication → Rate Limits) — for dev/pilot testing:
   - **Rate limit for sending emails** — increase from **2** to e.g. **30** or **120** (this is what blocks magic links; sign-ups/sign-ins limits are separate)
   - Click **Save changes**

Dashboard → **Authentication → Email templates** — optional branding.

---

## 3. Environment variables

`apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production:** omit `NEXT_PUBLIC_DEMO_MODE` (or set `false`). Users must sign in.

**UI preview only:** `NEXT_PUBLIC_DEMO_MODE=true` — skips auth and shows mock role picker on `/login`.

---

## 4. Create your first landlord user

ChopRent uses **two layers**:

| Layer | What it is | Where it lives |
|-------|------------|----------------|
| **Auth user** | Your email login | Supabase → Authentication → Users |
| **Membership** | Your role in the pilot plaza (owner/manager/agent) | `memberships` table in Postgres |

Signing up at `/login` only creates the **auth user**. The app cannot send you to the dashboard until a **membership** row exists. That is expected — not a bug.

### Step-by-step (do in this order)

#### Step 4A — Create account (password — recommended)

1. **http://localhost:3000/login** → **Password** → **First time here? Create an account**
2. Enter email, password (6+ characters), and choose your role (Landlord / Manager / Agent)
3. Supabase Dashboard → **Authentication → Providers → Email** → turn **off** “Confirm email”
4. Ensure `SUPABASE_SERVICE_ROLE_KEY` is in `apps/web/.env.local` (server only — links your role automatically)
5. You should land on **`/d/pilot-plaza`**

#### Step 4B — Already signed in but not linked?

If you see **“One more step”** (`/access-pending`):

1. Choose **Landlord**, **Manager**, or **Agent**
2. Click **Continue to my dashboard** — no SQL or scripts needed

Only **one Landlord** per plaza is allowed; additional users pick Manager or Agent.

#### Step 4B-alt — Manual SQL (optional fallback for admins)

<details>
<summary>Advanced: SQL in Supabase dashboard</summary>

```sql
insert into memberships (user_id, organization_id, role)
select id, '11111111-1111-1111-1111-111111111111', 'owner'::membership_role
from auth.users where email = 'you@your-email.com'
on conflict (user_id, organization_id) do update set role = 'owner';
```

</details>

#### Step 4C — Sign in again

1. **http://localhost:3000/login** → **Password** tab → sign in
2. Open **Units** — seeded shops from the database

#### Forgot password

ChopRent sends reset emails via **Resend** (not Supabase’s template) using a `token_hash` link — **no PKCE**, works in any browser.

**Requires:** `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local` (and Vercel). Optional: `RESEND_API_KEY` — without it, dev logs the reset link in the terminal running `npm run dev`.

1. Login → **Password** → **Forgot password?** → enter email → **Send reset link**
2. Open the **ChopRent** email (subject: “Reset your ChopRent password”) — not an old Supabase-only email
3. Click link → **Set a new password** → save → dashboard opens

**Supabase redirect URLs** must include `/auth/reset-password` and `/auth/reset-password/verify` (local + production).

**Note:** Old reset emails (Supabase PKCE links) will not work — always request a **new** link after deploying this fix.

#### Phone SMS cost (not recommended for pilot)

Supabase Phone auth uses a paid SMS provider (Twilio, MessageBird, etc.). Approximate **Twilio** rate to Nigeria: **~$0.39 USD per SMS** (~**₦550–650** per OTP at typical FX, varies daily). Not free — stick with **password** for pilot.

### B. Grant owner access (SQL) — reference

Same as step 4B above. The org id `11111111-…` is the seeded **Pilot Landlord Org** from migrations.

### C. Manager / agent

Same pattern with `role = 'manager'` or `'agent'`.

For **agents**, also assign plaza:

```sql
insert into site_assignments (user_id, site_id)
values (
  'AGENT_USER_UUID',
  '22222222-2222-2222-2222-222222222222'
);
```

### D. Tenant

1. Create auth user (tenant signs up or you invite via email)
2. Create active lease linked to tenant:

```sql
insert into leases (
  unit_id,
  tenant_user_id,
  tenant_display_name,
  tenant_phone,
  start_date,
  end_date,
  billing_cadence,
  status
)
values (
  '44444444-4444-4444-4444-444444444401',
  'TENANT_USER_UUID',
  'Chidi Traders Ltd',
  '+2348012345678',
  current_date,
  current_date + interval '1 year',
  'annual',
  'active'
);

update units set status = 'occupied' where id = '44444444-4444-4444-4444-444444444401';
```

Tenant sign-in → `/t/pilot-plaza`.

---

## 5. What works in Sprint 1

| Feature | Status |
|---------|--------|
| Email magic link login | ✓ |
| Phone OTP login | ✓ (needs SMS provider) |
| Middleware route protection | ✓ |
| Staff dashboard access via `memberships` | ✓ |
| Tenant portal via active `leases` | ✓ |
| Units list from Supabase | ✓ |
| Unit detail from Supabase | ✓ |
| Landlord add unit (composite codes) | ✓ |
| Payments / leases / ledger real data | Sprint 2–3 |
| Paystack DVA | Sprint 8 |

---

## 6. Verify

```bash
cd apps/web && npm run typecheck && npm run build
```

Manual checks:

1. `/login` → email link → `/d/pilot-plaza` (owner)
2. `/d/pilot-plaza/units` — see seeded units (14, 14/16, Flat 3B, 16)
3. `/d/pilot-plaza/units/new` — add unit `18` → appears in list
4. Tenant user → `/t/pilot-plaza` after lease row exists

---

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| `otp_expired` / link invalid | Request a **new** magic link; click **once** within minutes; don't reuse old emails |
| `email rate limit exceeded` | Raise **Rate limit for sending emails** (not sign-ups/verifications) in Supabase → Auth → Rate Limits; default is often **2/hour**. Save, wait for the hour window to reset, or use **/auth/redirect** if already signed in |
| `no_access` after login | Normal before step 4B — run the membership SQL, then open **/auth/redirect** |
| RLS empty units | Confirm user belongs to org; run `supabase db push` |
| Magic link wrong host | `NEXT_PUBLIC_APP_URL` must match browser URL (e.g. `http://localhost:3000`); add same URL in Supabase → Auth → URL configuration |
| Link opens wrong port | Dev must run on same port as `NEXT_PUBLIC_APP_URL` (default 3000) |
| Demo mode always on | Remove `NEXT_PUBLIC_DEMO_MODE=true` from Vercel/local env |
| Duplicate unit code | Unique per plaza — pick another code |

---

## Next sprint (Sprint 2)

Leases + renewals, charge engine, ledger periods — replaces mock payments/leases pages.
