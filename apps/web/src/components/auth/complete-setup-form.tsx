"use client";

import { useEffect, useState } from "react";
import { linkPlazaAccount } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import { LoadingButton } from "@/components/ui/loading-button";

export function CompleteSetupForm({ email }: { email: string }) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {};
      if (typeof meta.workspace_name === "string" && meta.workspace_name.trim()) {
        setWorkspaceName(meta.workspace_name.trim());
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = workspaceName.trim();
    if (!trimmed) {
      toast.error("Enter your plaza or property name.");
      return;
    }
    setLoading(true);

    try {
      const result = await linkPlazaAccount("owner", trimmed);
      if (result?.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      toast.success("Account linked — opening your dashboard…");
      window.location.replace("/auth/redirect");
    } catch {
      window.location.replace("/auth/redirect");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted">
        Signed in as <strong className="text-foreground">{email}</strong>. Set up
        your landlord workspace:
      </p>

      <div>
        <label className="text-label normal-case">Plaza / property name</label>
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          className="input-field mt-1"
          placeholder="e.g. Sunrise Plaza, Lekki Properties"
          required
          disabled={loading}
        />
        <p className="mt-1 text-[11px] text-muted">
          This becomes your dashboard URL (e.g. /d/sunrise-plaza). You can change
          it later in Settings.
        </p>
      </div>

      <p className="text-[11px] text-muted">
        Managers, agents, and tenants join with an invite link you send — they
        should not use this page.
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
