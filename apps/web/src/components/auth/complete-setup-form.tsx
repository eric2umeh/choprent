"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkPlazaAccount } from "@/lib/actions/auth";
import { toast } from "@/components/ui/toast";
import { LoadingButton } from "@/components/ui/loading-button";
import type { MembershipRole } from "@/types/database";

const ROLES: { value: MembershipRole; label: string; hint: string }[] = [
  {
    value: "owner",
    label: "Landlord",
    hint: "Owns the plaza — full access, can add shops",
  },
  {
    value: "manager",
    label: "Manager",
    hint: "Runs day-to-day — leases, payments, letters",
  },
  {
    value: "agent",
    label: "Agent",
    hint: "Verifies receipts at assigned plaza only",
  },
];

export function CompleteSetupForm({ email }: { email: string }) {
  const router = useRouter();
  const [role, setRole] = useState<MembershipRole>("owner");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await linkPlazaAccount(role);
      if (result?.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      toast.success("Account linked — opening your dashboard…");
      router.push("/auth/redirect");
      router.refresh();
    } catch {
      router.push("/auth/redirect");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted">
        Signed in as <strong className="text-foreground">{email}</strong>. Choose
        how you use ChopRent at this plaza:
      </p>

      <div className="space-y-2">
        {ROLES.map((r) => (
          <label
            key={r.value}
            className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition ${
              role === r.value
                ? "border-green-300 bg-green-50"
                : "border-border hover:border-green-200"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={r.value}
              checked={role === r.value}
              onChange={() => setRole(r.value)}
              className="mt-0.5"
              disabled={loading}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {r.label}
              </span>
              <span className="block text-xs text-muted">{r.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <p className="text-[11px] text-muted">
        Shop tenants: your manager adds you when your lease is active — no setup
        needed here.
      </p>

      <LoadingButton
        type="submit"
        loading={loading}
        loadingLabel="Setting up…"
        className="btn-primary w-full py-2.5 disabled:opacity-60"
      >
        Continue to my dashboard
      </LoadingButton>
    </form>
  );
}
