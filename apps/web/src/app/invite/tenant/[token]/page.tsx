import { AcceptTenantInviteForm } from "@/components/auth/accept-tenant-invite-form";
import { getTenantInvitePreview } from "@/lib/actions/tenant-invite";
import { Logo } from "@/components/logo";
import Link from "next/link";

export default async function TenantInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getTenantInvitePreview(token);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-subtle px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex justify-center">
            <Logo />
          </Link>
          <h1 className="mt-4 text-page-title">Tenant portal invite</h1>
          <p className="mt-1 text-page-desc">
            {preview.alreadyAccepted
              ? "Enter your password to open your tenant dashboard."
              : "Set your password to access your unit dashboard."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <AcceptTenantInviteForm token={token} preview={preview} />
        </div>
      </div>
    </main>
  );
}
