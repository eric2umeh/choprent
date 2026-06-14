"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { linkPlazaAccount } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { formatAuthError, MAGIC_LINK_COOLDOWN_SEC } from "@/lib/auth/messages";
import { appUrl } from "@/lib/env";
import { PasswordInput } from "@/components/ui/password-input";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";
import type { MembershipRole } from "@/types/database";

type LoginMethod = "password" | "magic_link" | "phone";
type PasswordMode = "sign_in" | "sign_up" | "forgot_password";

const SIGNUP_ROLES: { value: MembershipRole; label: string }[] = [
  { value: "owner", label: "Landlord — I own this plaza" },
  { value: "manager", label: "Manager — I run day-to-day operations" },
  { value: "agent", label: "Agent — I verify payments on site" },
];

export function LoginForm() {
  const router = useRouter();
  const [method, setMethod] = useState<LoginMethod>("password");
  const [mode, setMode] = useState<PasswordMode>("sign_in");
  const [signupRole, setSignupRole] = useState<MembershipRole>("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const trimmedEmail = email.trim();

    try {
      if (mode === "forgot_password") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          trimmedEmail,
          {
            redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
          }
        );
        if (resetError) throw resetError;
        toast.success(
          "If we have that email on file, you'll receive a link to choose a new password. Check your inbox (and spam)."
        );
        return;
      }

      if (mode === "sign_up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (signUpError) throw signUpError;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          toast.info(
            "Your account was created. Sign in with your email and password to finish."
          );
          setMode("sign_in");
          return;
        }

        const linkResult = await linkPlazaAccount(signupRole);
        if (linkResult?.error) {
          toast.error(linkResult.error);
          return;
        }
        toast.success("Account created — opening your dashboard…");
        router.push("/auth/redirect");
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) throw signInError;

      toast.success("Signed in — opening your dashboard…");
      router.push("/auth/redirect");
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Sign-in failed.";
      toast.error(formatAuthError(raw));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);

    const supabase = createClient();

    try {
      if (method === "magic_link") {
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${appUrl()}/auth/callback`,
          },
        });
        if (authError) throw authError;
        toast.success("Check your email for a sign-in link.");
        setCooldown(MAGIC_LINK_COOLDOWN_SEC);
      } else {
        const normalized = phone.trim().startsWith("+")
          ? phone.trim()
          : `+234${phone.trim().replace(/^0/, "")}`;

        const { error: authError } = await supabase.auth.signInWithOtp({
          phone: normalized,
        });
        if (authError) throw authError;
        toast.success("Check your phone for a verification code.");
        setCooldown(MAGIC_LINK_COOLDOWN_SEC);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Sign-in failed.";
      toast.error(formatAuthError(raw));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex rounded-lg border border-border p-0.5">
        {(
          [
            ["password", "Password"],
            ["magic_link", "Magic link"],
            ["phone", "Phone"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMethod(key);
            }}
            className={`flex-1 rounded-md py-2 text-xs font-medium ${
              method === key
                ? "bg-green-100 text-green-800"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {method === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <p className="text-[11px] text-muted">
            {mode === "forgot_password"
              ? "We'll email you a link to reset your password."
              : mode === "sign_up"
                ? "Create your account — no confirmation email needed."
                : "Sign in with the email and password you registered with."}
          </p>
          <div>
            <label className="text-label normal-case">Email address</label>
            <input
              className="input-field mt-1"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.ng"
              autoComplete="email"
            />
          </div>
          {mode !== "forgot_password" && (
            <div>
              <label className="text-label normal-case">Password</label>
              <PasswordInput
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === "sign_up" ? "new-password" : "current-password"}
              />
            </div>
          )}

          {mode === "sign_up" && (
            <div>
              <label className="text-label normal-case">I am a…</label>
              <div className="mt-2 space-y-2">
                {SIGNUP_ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                      signupRole === r.value
                        ? "border-green-300 bg-green-50"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="signup_role"
                      checked={signupRole === r.value}
                      onChange={() => setSignupRole(r.value)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Shop tenants are added by the plaza manager when your lease starts.
              </p>
            </div>
          )}

          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Please wait…"
            className="btn-primary w-full py-2.5 disabled:opacity-60"
          >
            {mode === "forgot_password"
              ? "Send reset link"
              : mode === "sign_up"
                ? "Create account"
                : "Sign in"}
          </LoadingButton>

          {mode === "sign_in" && (
            <button
              type="button"
              className="w-full text-xs text-muted hover:text-foreground"
              onClick={() => {
                setMode("forgot_password");
              }}
            >
              Forgot password?
            </button>
          )}

          {mode === "forgot_password" && (
            <button
              type="button"
              className="w-full text-xs text-muted hover:text-foreground"
              onClick={() => {
                setMode("sign_in");
              }}
            >
              Back to sign in
            </button>
          )}

          {mode !== "forgot_password" && (
            <button
              type="button"
              className="w-full text-xs text-muted hover:text-foreground"
              onClick={() => {
                setMode(mode === "sign_in" ? "sign_up" : "sign_in");
              }}
            >
              {mode === "sign_in"
                ? "First time here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          )}
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          {method === "magic_link" && (
            <p className="text-[11px] text-amber-800">
              Email links are limited on free plans.{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => setMethod("password")}
              >
                Password sign-in
              </button>{" "}
              is more reliable.
            </p>
          )}
          {method === "phone" && (
            <p className="text-[11px] text-muted">
              Phone sign-in requires SMS setup and has a per-message cost.
            </p>
          )}

          {method === "magic_link" ? (
            <div>
              <label className="text-label normal-case">Email address</label>
              <input
                className="input-field mt-1"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.ng"
                autoComplete="email"
              />
            </div>
          ) : (
            <div>
              <label className="text-label normal-case">Phone number</label>
              <input
                className="input-field mt-1"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
                autoComplete="tel"
              />
            </div>
          )}

          <LoadingButton
            type="submit"
            loading={loading}
            disabled={cooldown > 0}
            loadingLabel="Sending…"
            className="btn-primary w-full py-2.5 disabled:opacity-60"
          >
            {cooldown > 0
              ? `Wait ${cooldown}s`
              : method === "magic_link"
                ? "Send magic link"
                : "Send SMS code"}
          </LoadingButton>
        </form>
      )}

      <p className="mt-4 text-center text-[11px] text-muted">
        Already signed in?{" "}
        <Link href="/auth/redirect" className="text-green-700 hover:underline">
          Open my dashboard
        </Link>
      </p>
    </div>
  );
}
