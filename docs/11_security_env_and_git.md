# Security — env files and git

## Never commit

| File | Purpose |
|------|---------|
| `.env.local` | Real secrets (local) |
| `apps/web/.env.local` | Real secrets (Next.js reads this) |
| `.env` | Same — do not commit |

## Safe to commit

| File | Purpose |
|------|---------|
| `.env.example` | Placeholders only — no real keys |

---

## If secrets were pushed to GitHub

### 1. Invalidate Supabase keys (required)

Supabase **no longer offers “rotate service_role only”** for legacy JWT keys.

**Recommended (2026):**

1. Dashboard → **Project Settings** → **API Keys**
2. Click **Create new API keys** (if you only have legacy keys)
3. Copy the new **Secret key** (`sb_secret_...`)
4. In `apps/web/.env.local`, set:
   - `SUPABASE_SERVICE_ROLE_KEY=<new secret key>`
   - Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the **Publishable key** (`sb_publishable_...`) when ready
5. Redeploy Vercel / restart local dev
6. In API Keys, **disable** the old legacy `service_role` key once everything works

Docs: [Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

**If the JWT secret itself leaked** (rare): Settings → **JWT Keys** → migrate to asymmetric signing keys per Supabase docs.

### 2. Remove `.env.local` from git history

Only needed if the file was actually committed (check with `git log --all -- .env.local apps/web/.env.local`).

```bash
cd /path/to/choprent

# Backup your real env file first (outside the repo)
cp apps/web/.env.local ~/choprent-env-backup.local

# Remove env secret files from ALL commits
git filter-repo \
  --path .env.local \
  --path apps/web/.env.local \
  --path .env \
  --path apps/web/.env \
  --invert-paths \
  --force

# Restore your local secrets (gitignored)
cp ~/choprent-env-backup.local apps/web/.env.local

# Push rewritten history
git push origin development --force
git push origin main --force
```

Install: `brew install git-filter-repo`

**Note:** `--force` rewrites remote history. Tell anyone else on the repo to re-clone or reset their branch.

### 3. Resolve GitGuardian

Mark the incident resolved after keys are invalidated and history is cleaned.

### False positives on auth forms

GitGuardian may flag `login-form.tsx` with **“Generic Password”** for HTML autocomplete values (`new-password`, `current-password`). These are not secrets — dismiss as false positive in GitGuardian, or rely on `.gitguardian.yml` in the repo root.

---

## Verify cleanup

```bash
# Should print nothing if .env.local was fully removed from history
git log --all --oneline -- .env.local apps/web/.env.local

# Should print nothing after keys are rotated and old blobs purged
git log -p --all -S 'eyJhbGci' -- .env.local apps/web/.env.local
```
