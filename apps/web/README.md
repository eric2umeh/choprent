# ChopRent Web

Next.js app for ChopRent — see repo root `README.md` and `docs/` for architecture.

## Local setup

```bash
# from repo root
cp .env.example apps/web/.env.local
# fill in Supabase URL + anon key

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
