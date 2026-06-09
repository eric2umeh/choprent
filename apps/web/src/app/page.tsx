import Link from "next/link";

const features = [
  {
    title: "Plaza → units",
    body: "Composite shop numbers like 14/16, property types, and lease renewals.",
  },
  {
    title: "Flexible charges",
    body: "Annual rent plus service %, agency fees, VAT, diesel, and security lines.",
  },
  {
    title: "Trader-friendly pay",
    body: "Bank transfer and receipt upload now; dedicated shop accounts in Phase 1.5.",
  },
  {
    title: "Real-time ops",
    body: "Managers and agents verify payments; landlords add units and provision DVAs.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-forest/10 bg-sand/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="font-display text-xl font-semibold text-forest">
            ChopRent
          </span>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate hover:bg-forest/5"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-forest-light"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber">
              Sprint 0 scaffold
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-forest sm:text-5xl">
              Rent collection built for Nigerian plazas
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Mobile-first web app for landlords, managers, agents, and tenants.
              Track units, leases, arrears, and verified payments — with dedicated
              shop accounts coming next.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white hover:bg-forest-light"
              >
                Open dashboard
              </Link>
              <a
                href="https://github.com/eric2umeh/choprent"
                className="inline-flex items-center justify-center rounded-full border border-forest/20 bg-card px-6 py-3 text-sm font-semibold text-forest hover:border-forest/40"
                target="_blank"
                rel="noreferrer"
              >
                View repo
              </a>
            </div>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-forest/10 bg-card p-5 shadow-sm"
              >
                <h2 className="font-display text-lg font-semibold text-forest">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-amber/30 bg-amber/10 p-5">
            <h2 className="font-display text-lg font-semibold text-forest">
              Sprint 0 complete when connected
            </h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>
                Create a Supabase project and copy keys to{" "}
                <code className="text-forest">apps/web/.env.local</code>
              </li>
              <li>
                Run <code className="text-forest">supabase db push</code> to apply
                migrations
              </li>
              <li>
                Run <code className="text-forest">npm install</code> then{" "}
                <code className="text-forest">npm run dev</code>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-forest/10 py-6 text-center text-xs text-muted">
        ChopRent · Next.js · Supabase · Vercel
      </footer>
    </div>
  );
}
