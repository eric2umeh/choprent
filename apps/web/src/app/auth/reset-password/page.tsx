import Link from "next/link";
import { Logo } from "@/components/logo";
import { RecoveryHashHandler } from "@/components/auth/recovery-hash-handler";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-sm">
        <Logo />
        <h1 className="text-page-title mt-4">Set a new password</h1>
        <p className="text-page-desc mt-1">
          Choose a new password for your ChopRent account.
        </p>
        <div className="mt-6">
          <RecoveryHashHandler />
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
