"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { dismissPilotOnboarding } from "@/lib/actions/onboarding";
import { toast } from "@/components/ui/toast";
import type { PilotOnboardingStatus } from "@/lib/data/pilot-onboarding";

export function PilotSetupChecklist({
  orgSlug,
  status,
}: {
  orgSlug: string;
  status: PilotOnboardingStatus;
}) {
  const [dismissed, setDismissed] = useState(status.dismissed);
  const [pending, startTransition] = useTransition();

  if (dismissed) return null;

  const pct =
    status.totalCount > 0
      ? Math.round((status.completedCount / status.totalCount) * 100)
      : 0;

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissPilotOnboarding(orgSlug);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDismissed(true);
      toast.success("Setup guide hidden.");
    });
  }

  return (
    <section className="border-b border-green-200 bg-gradient-to-br from-green-50 to-white px-3 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-section-title text-green-900">Pilot setup</h2>
          <p className="mt-0.5 text-sm text-green-800/80">
            {status.allRequiredDone
              ? "All required steps complete — dismiss when you’re ready."
              : `${status.completedCount} of ${status.totalCount} steps done — get your plaza live.`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={pending}
          className="interactive-lift shrink-0 rounded-lg p-1.5 text-green-700 hover:bg-green-100"
          aria-label="Dismiss setup guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-green-100">
        <div
          className="h-full rounded-full bg-green-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="mt-4 space-y-2">
        {status.steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={`flex gap-3 rounded-xl border px-3 py-2.5 transition hover:border-green-300 hover:bg-white ${
                step.done
                  ? "border-green-200 bg-white/60 opacity-75"
                  : "border-green-200/80 bg-white"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              )}
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {step.title}
                  </span>
                  {step.optional && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                      Optional
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {step.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
