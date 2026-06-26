import Link from "next/link";
import { DashboardPreview } from "@/components/dashboard-preview";
import { Logo } from "@/components/logo";

const features = [
  {
    title: "Dedicated shop accounts",
    body: "Each unit gets a persistent NUBAN. Traders pay by transfer — no app required.",
  },
  {
    title: "Verified collections",
    body: "Receipt upload, manager verification, and a full audit trail for every payment.",
  },
  {
    title: "Plaza-native billing",
    body: "Annual rent, service charges, composite units like 14/16, and arrears that carry forward.",
  },
  {
    title: "Real-time dashboards",
    body: "Landlords, managers, and agents see collection rate and outstanding rent live.",
  },
];

const trustItems = [
  "Built for Nigerian plazas",
  "Bank transfer first",
  "Mobile responsive",
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a href="#how" className="transition hover:text-foreground">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="btn-ghost px-4 py-2">
              Sign in
            </Link>
            <Link href="/login" className="btn-primary px-4 py-2">
              Demo
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border bg-white bg-grid-light">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-green-50/80 to-white" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
              Plaza rent collection · Nigeria
            </p>
            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              Collect rent from your plaza{" "}
              <span className="text-green-700">with confidence.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              From shop transfers to verified receipts — everything landlords,
              managers, and traders need for modern plaza operations.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="btn-primary px-6 py-3 text-base">
                Explore demo
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {trustItems.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:pl-4">
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Built different from generic rent apps
            </h2>
            <p className="mt-3 text-base text-muted">
              ChopRent is plaza-first — not a US card checkout clone.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-border bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how"
        className="border-y border-border bg-surface-subtle px-4 py-20 sm:px-6"
      >
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Get paid faster, track every naira
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Tenants transfer to a shop account or upload a receipt. Managers
              verify in one queue. Landlords see collection rate, arrears, and
              exportable reports — in real time.
            </p>
            <Link href="/login" className="btn-primary mt-8 inline-flex px-6 py-3">
              Open dashboard
            </Link>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
            <ol className="space-y-6">
              {[
                "Landlord adds plaza units",
                "Manager assigns tenant & charges",
                "Tenant pays via transfer or DVA",
                "Payment verified → ledger updated",
              ].map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-600 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-sm font-medium text-foreground">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface-subtle px-6 py-12 text-center sm:px-10">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Ready to run your plaza on ChopRent?
          </h2>
          <p className="mt-3 text-muted">
            Mobile-first. Supabase-backed. Built for Nigerian plazas from day one.
          </p>
          <Link
            href="/login"
            className="btn-primary mt-8 inline-flex px-8 py-3 text-base"
          >
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-white py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ChopRent</p>
        <p className="mt-2 space-x-3">
          <a
            href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "choprent.tech@gmail.com"}`}
            className="hover:text-foreground"
          >
            {process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "choprent.tech@gmail.com"}
          </a>
          <span aria-hidden>·</span>
          <a
            href={`tel:${(process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+2348180329799").replace(/\s/g, "")}`}
            className="hover:text-foreground"
          >
            {process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+234 818 032 9799"}
          </a>
        </p>
      </footer>
    </div>
  );
}
