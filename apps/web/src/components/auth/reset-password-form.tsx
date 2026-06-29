"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearPasswordRecoveryCookie } from "@/lib/actions/recovery";
import { createClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/auth/messages";
import { PasswordInput } from "@/components/ui/password-input";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionReady(true);
        setChecking(false);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sessionReady) {
      toast.error(
        "Reset link expired or already used. Request a new link from the login page."
      );
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(
          "Reset link expired. Go to login → Forgot password and request a new link."
        );
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await clearPasswordRecoveryCookie();
      toast.success("Password updated — opening your dashboard…");
      router.push("/auth/redirect");
      router.refresh();
    } catch (err) {
      toast.error(
        formatAuthError(err instanceof Error ? err.message : "Could not update password.")
      );
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <p className="text-center text-sm text-muted">Verifying your reset link…</p>
    );
  }

  if (!sessionReady) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted">
          This reset link has expired or was already used. Request a fresh link
          from the login page.
        </p>
        <Link href="/login" className="btn-primary inline-flex px-4 py-2 text-sm">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-label normal-case">New password</label>
        <PasswordInput
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="At least 6 characters"
        />
      </div>
      <div>
        <label className="text-label normal-case">Confirm password</label>
        <PasswordInput
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="Re-enter your password"
        />
      </div>

      <LoadingButton
        type="submit"
        loading={loading}
        loadingLabel="Saving…"
        className="btn-primary w-full py-2.5 disabled:opacity-60"
      >
        Save new password
      </LoadingButton>

      <Link href="/login" className="block text-center text-xs text-muted hover:text-foreground">
        Back to login
      </Link>
    </form>
  );
}
