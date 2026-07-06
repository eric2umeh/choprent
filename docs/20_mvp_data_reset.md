# MVP data reset

Wipe all test/pilot data and start with **real customers**. Schema and migrations are kept.

---

## What gets deleted

| Area | Removed |
|------|---------|
| Organizations, sites, units, leases | All |
| Payments, ledger, expenses | All |
| Documents metadata, reminders, notifications | All |
| Storage files | `receipts` + `documents` buckets emptied |
| **Auth users** | All (landlords, managers, tenants) |

## What stays

- Database schema + RLS
- Migrations history
- Empty storage buckets
- Vercel / env configuration

---

## Cloud (production / staging)

From repo root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
npm run db:reset-mvp:yes
```

If your terminal says `npm: command not found`, either fix Node in your PATH (`export PATH="/usr/local/bin:$PATH"` or open a new terminal), or run the script directly:

```bash
bash scripts/reset-mvp.sh --yes
```

Or interactive (type `RESET` when prompted):

```bash
npm run db:reset-mvp
```

Run `supabase link` **before** the reset — do not chain it on the same line as `npm run db:reset-mvp` or stdin can break the confirmation prompt.

---

## Local dev

```bash
supabase db reset
```

`seed.sql` is empty — no pilot plaza is re-inserted.

---

## After reset

1. **Sign up** at `/login` → choose **Landlord** → enter workspace name
2. Complete **Pilot setup** checklist on dashboard
3. Add real property, units, bank account, tenants
4. Invite managers from **Users** if needed

---

## Script

[`supabase/scripts/reset_mvp_data.sql`](../supabase/scripts/reset_mvp_data.sql)

---

## Warning

**Irreversible.** Export anything you need from Supabase dashboard before running.
