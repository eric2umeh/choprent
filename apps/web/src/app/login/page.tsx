import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/auth/login-form";
import { LoginAuthAlerts } from "@/components/auth/login-auth-alerts";
import { LoadingState } from "@/components/ui/loading-state";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-green-50 bg-grid-light p-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 to-green-50" />
        <div className="relative animate-fade-in">
          <Logo />
        </div>
        <div className="relative animate-fade-up" style={{ animationDelay: "80ms" }}>
          <h1 className="max-w-md text-4xl font-bold leading-tight text-foreground">
            Manage your properties{" "}
            <span className="text-green-700">with confidence.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Sign in with email and password. Landlords, managers, agents, and tenants
            use the same login — we route you to the right portal.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">
          ChopRent · Nigerian rent collection
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
            Password sign-in (recommended) · magic link
          </p>

          <div className="animate-fade-up mt-8">
            <Suspense fallback={<LoadingState label="Loading…" className="py-4" />}>
              <LoginAuthAlerts />
            </Suspense>
            <LoginForm />
          </div>

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
