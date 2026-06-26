"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reopenPilotOnboarding } from "@/lib/actions/onboarding";
import { toast } from "@/components/ui/toast";
import { SettingsSectionCard } from "@/components/ui/form-panel";

export function PilotSetupSettingsCard({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleReopen() {
    startTransition(async () => {
      const result = await reopenPilotOnboarding(orgSlug);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Setup guide restored on your dashboard.");
        router.push(`/d/${orgSlug}`);
        router.refresh();
      }
    });
  }

  return (
    <SettingsSectionCard
      title="Pilot setup guide"
      description="Step-by-step checklist for getting your first plaza live."
      action={
        <button
          type="button"
          className="btn-ghost shrink-0 px-3 py-1.5 text-sm"
          disabled={pending}
          onClick={handleReopen}
        >
          {pending ? "Opening…" : "Show on dashboard"}
        </button>
      }
    >
      <p className="text-sm text-muted">
        Reopen the setup checklist if you dismissed it or need to walk a new
        manager through onboarding.
      </p>
    </SettingsSectionCard>
  );
}
