import { AcceptStaffInviteForm } from "@/components/auth/accept-staff-invite-form";
import { getStaffInvitePreview } from "@/lib/actions/staff-invite";
import { Logo } from "@/components/logo";

export default async function StaffInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getStaffInvitePreview(token);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-subtle px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex justify-center">
            <Logo />
          </div>
          <h1 className="mt-4 text-page-title">Staff invite</h1>
          <p className="mt-1 text-page-desc">
            {preview.alreadyAccepted
              ? "Enter your password to open your dashboard."
              : "Set your password to join this workspace."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <AcceptStaffInviteForm token={token} preview={preview} />
        </div>
      </div>
    </main>
  );
}
