import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/auth/login-form";
import { LoginAuthAlerts } from "@/components/auth/login-auth-alerts";
import { isDemoMode } from "@/lib/env";
import { MOCK_ORG } from "@/lib/mock/data";

const demoRoles = [
  {
    label: "Landlord",
    desc: "Full access · add units",
    href: `/d/${MOCK_ORG.slug}`,
  },
  {
    label: "Manager",
    desc: "Leases · verify · no add units",
    href: `/d/${MOCK_ORG.slug}?role=manager`,
  },
  {
    label: "Agent",
    desc: "Verify payments · assigned site",
    href: `/d/${MOCK_ORG.slug}?role=agent`,
  },
  {
    label: "Tenant",
    desc: "Shop 14 · pay · ledger · docs",
    href: `/t/${MOCK_ORG.slug}`,
  },
];

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const demoMode = isDemoMode();

  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-green-50 bg-grid-light p-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 to-green-50" />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative">
          <h1 className="max-w-md text-4xl font-bold leading-tight text-foreground">
            Manage your plaza{" "}
            <span className="text-green-700">with confidence.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Sign in with email or phone. Landlords, managers, agents, and tenants
            use the same login — we route you to the right portal.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">
          Sprint 1 · Supabase Auth
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Sign in to ChopRent
          </h2>
          <p className="mt-2 text-sm text-muted">
            Password sign-in (recommended) · magic link · phone OTP
          </p>

          <div className="mt-8">
            <Suspense fallback={null}>
              <LoginAuthAlerts />
            </Suspense>
            <LoginForm />
          </div>

          {demoMode && (
            <div className="mt-10 border-t border-border pt-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Demo mode (mock data)
              </p>
              <div className="mt-3 space-y-2">
                {demoRoles.map((role) => (
                  <Link
                    key={role.label}
                    href={role.href}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm transition hover:border-green-300 hover:bg-green-50/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{role.label}</p>
                      <p className="text-xs text-muted">{role.desc}</p>
                    </div>
                    <span className="text-green-600">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/"
            className="mt-8 flex w-full items-center justify-center text-sm font-medium text-muted transition hover:text-foreground"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
