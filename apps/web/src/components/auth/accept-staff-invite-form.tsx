"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  acceptStaffInvite,
  type StaffInvitePreview,
} from "@/lib/actions/staff-invite";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";
import { AUTOCOMPLETE_NEW_PASSWORD } from "@/lib/auth/autocomplete";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-validation";
import { PasswordInput } from "@/components/ui/password-input";
import { formatMembershipRole } from "@/lib/auth/role-labels";

export function AcceptStaffInviteForm({
  token,
  preview,
}: {
  token: string;
  preview: StaffInvitePreview;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const alreadyUsed = !!preview.alreadyAccepted;

  if (preview.error && !preview.email && !alreadyUsed) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{preview.error}</p>
        <Link href="/login" className="btn-primary inline-flex px-4 py-2 text-sm">
          Go to sign in
        </Link>
      </div>
    );
  }

  async function finishSignIn(email: string, orgSlug: string, pwd: string) {
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: pwd,
    });

    if (signInError) {
      toast.error(
        signInError.message ||
          "Account is ready, but sign-in failed. Try your password again."
      );
      setLoading(false);
      submitting.current = false;
      return;
    }

    toast.success("Welcome — opening your dashboard.");
    window.location.replace(`/d/${orgSlug}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    submitting.current = true;
    setLoading(true);

    const result = await acceptStaffInvite(token, password, fullName);
    if (result.error || !result.success || !result.email || !result.orgSlug) {
      setLoading(false);
      submitting.current = false;
      toast.error(result.error ?? "Could not accept invite.");
      return;
    }

    await finishSignIn(result.email, result.orgSlug, password);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(preview.orgName || preview.email) && (
        <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3 text-sm">
          {preview.orgName && (
            <p className="text-list-primary">{preview.orgName}</p>
          )}
          {preview.role && (
            <p className="mt-1 text-list-secondary">
            Role:{" "}
            {formatMembershipRole(
              (preview.role ?? "manager") as "admin" | "manager" | "agent" | "owner"
            )}
            </p>
          )}
          {preview.email && (
            <p className="mt-1 text-list-meta">{preview.email}</p>
          )}
        </div>
      )}

      {alreadyUsed && (
        <p className="text-xs text-amber-800">
          This invite was already accepted. Enter the password you created to open
          your dashboard.
        </p>
      )}

      {!alreadyUsed && (
        <div>
          <label className="text-label normal-case">Your name</label>
          <input
            className="input-field mt-1"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            disabled={loading}
          />
        </div>
      )}

      <div>
        <label className="text-label normal-case">
          {alreadyUsed ? "Your password" : "Create password"}
        </label>
        <PasswordInput
          className="mt-1"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoComplete={AUTOCOMPLETE_NEW_PASSWORD}
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-label normal-case">Confirm password</label>
        <PasswordInput
          className="mt-1"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter your password"
          autoComplete={AUTOCOMPLETE_NEW_PASSWORD}
          disabled={loading}
        />
      </div>

      <LoadingButton
        type="submit"
        loading={loading}
        loadingLabel="Setting up…"
        className="btn-primary w-full py-2.5"
      >
        {alreadyUsed ? "Open dashboard" : "Create account & join"}
      </LoadingButton>

      <p className="text-center text-[11px] text-muted">
        Already set up?{" "}
        <Link href="/login" className="text-green-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
