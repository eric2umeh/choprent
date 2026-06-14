# Web app — local setup

Next.js app lives in `apps/web/`. See [00_project_summary.md](./00_project_summary.md) and [01_architecture.md](./01_architecture.md) for product context.

## Local setup

```bash
# from repo root
cp .env.example apps/web/.env.local
# fill in Supabase URL + keys (never commit this file)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

Seed data (local only): `supabase db reset`

See [07_supabase_setup.md](./07_supabase_setup.md) and [08_sprint1_auth_setup.md](./08_sprint1_auth_setup.md).
