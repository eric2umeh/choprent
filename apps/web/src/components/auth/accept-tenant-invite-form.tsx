"use client";

import { useRef, useState } from "react";
import {
  acceptTenantInvite,
  type TenantInvitePreview,
} from "@/lib/actions/tenant-invite";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";
import { AUTOCOMPLETE_NEW_PASSWORD } from "@/lib/auth/autocomplete";
import Link from "next/link";

export function AcceptTenantInviteForm({
  token,
  preview,
}: {
  token: string;
  preview: TenantInvitePreview;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState(preview.tenantName ?? "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

    toast.success("Welcome — opening your tenant dashboard.");
    // Hard navigation so session cookies are definitely applied.
    window.location.assign(`/t/${orgSlug}`);
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

    const result = await acceptTenantInvite(token, password, fullName);
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
      {(preview.tenantName || preview.email) && (
        <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3 text-sm">
          {preview.tenantName && (
            <p className="text-list-primary">{preview.tenantName}</p>
          )}
          {(preview.unitCode || preview.orgName) && (
            <p className="mt-1 text-list-secondary">
              {preview.unitCode ? `Unit ${preview.unitCode}` : null}
              {preview.unitCode && preview.orgName ? " · " : null}
              {preview.orgName}
            </p>
          )}
          {preview.email && (
            <p className="mt-2 text-table-cell-muted break-all">{preview.email}</p>
          )}
        </div>
      )}

      {alreadyUsed && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This invite was already accepted. Enter the password you created to open
          your tenant dashboard — you do not need to pick a staff role.
        </p>
      )}

      {!alreadyUsed && (
        <div>
          <label className="text-label normal-case">Your name</label>
          <input
            className="input-field mt-1.5"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            autoComplete="name"
          />
        </div>
      )}

      <div>
        <label className="text-label normal-case">
          {alreadyUsed ? "Your password" : "Create password"}
        </label>
        <div className="relative mt-1.5">
          <input
            type={showPassword ? "text" : "password"}
            className="input-field pr-16"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            autoComplete={AUTOCOMPLETE_NEW_PASSWORD}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div>
        <label className="text-label normal-case">Confirm password</label>
        <input
          type={showPassword ? "text" : "password"}
          className="input-field mt-1.5"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          disabled={loading}
          autoComplete={AUTOCOMPLETE_NEW_PASSWORD}
        />
      </div>

      <p className="text-form-hint">
        No role to choose — this opens your tenant dashboard for this unit only.
      </p>

      <LoadingButton
        type="submit"
        loading={loading}
        className="btn-primary w-full py-2.5"
      >
        {alreadyUsed ? "Open tenant dashboard" : "Create access & continue"}
      </LoadingButton>

      <p className="text-center text-sm text-muted">
        Having trouble?{" "}
        <Link href="/login" className="text-foreground underline">
          Sign in
        </Link>{" "}
        with this email — you should land on your tenant dashboard automatically.
      </p>
    </form>
  );
}
