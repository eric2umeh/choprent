import Link from "next/link";
import { Logo } from "@/components/logo";

const stats = [
  { value: "80+", label: "Units per plaza" },
  { value: "₦1M+", label: "Typical shop rent" },
  { value: "100%", label: "Verified audit trail" },
];

export default function LoginPage() {
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
            From rent collection to receipt verification — everything you need
            to run a modern property business in Nigeria.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-white px-3 py-4 shadow-sm"
              >
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-muted-foreground">
          ChopRent · Plaza rent collection
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted">
            Sign in to your ChopRent account
          </p>

          <form className="mt-8 space-y-5" action="#">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="input-field"
                autoComplete="email"
                disabled
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  Password
                </label>
                <span className="text-xs font-semibold text-green-700">
                  Forgot password?
                </span>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="input-field"
                autoComplete="current-password"
                disabled
              />
            </div>

            <button
              type="button"
              disabled
              className="btn-primary w-full cursor-not-allowed py-3 opacity-60"
            >
              Sign in — Sprint 1
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <span className="font-semibold text-green-700">Create one</span>
          </p>

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
