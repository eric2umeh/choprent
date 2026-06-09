import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-forest/10 bg-card p-8 shadow-sm">
        <p className="font-display text-2xl font-semibold text-forest">ChopRent</p>
        <p className="mt-2 text-sm text-muted">
          Auth UI ships in Sprint 1. Configure Supabase Auth (email + phone) first.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-forest py-3 text-sm font-semibold text-white hover:bg-forest-light"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
