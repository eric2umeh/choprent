"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState(preview.tenantName ?? "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (preview.error && !preview.email) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{preview.error}</p>
        <Link href="/login" className="btn-primary inline-flex px-4 py-2 text-sm">
          Go to sign in
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await acceptTenantInvite(token, password, fullName);
    if (result.error || !result.success || !result.email || !result.orgSlug) {
      setLoading(false);
      toast.error(result.error ?? "Could not accept invite.");
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.email,
      password,
    });
    setLoading(false);

    if (signInError) {
      toast.error(
        "Account is ready, but sign-in failed. Try signing in with your email and password."
      );
      router.push("/login");
      return;
    }

    toast.success("Welcome — opening your tenant dashboard.");
    router.replace(`/t/${result.orgSlug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3 text-sm">
        <p className="text-list-primary">{preview.tenantName}</p>
        <p className="mt-1 text-list-secondary">
          Unit {preview.unitCode} · {preview.orgName}
        </p>
        <p className="mt-2 text-table-cell-muted break-all">{preview.email}</p>
      </div>

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

      <div>
        <label className="text-label normal-case">Create password</label>
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
        No role to choose — this invite opens your tenant dashboard for this unit only.
      </p>

      <LoadingButton
        type="submit"
        loading={loading}
        className="btn-primary w-full py-2.5"
      >
        Create access &amp; continue
      </LoadingButton>

      <p className="text-center text-sm text-muted">
        Already set up?{" "}
        <Link href="/login" className="text-foreground underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
