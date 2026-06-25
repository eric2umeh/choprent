"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleReminderRule } from "@/lib/actions/reminders";
import type { ReminderRule } from "@/lib/actions/reminders";
import { toast } from "@/components/ui/toast";

export function ReminderRulesPanel({
  orgSlug,
  rules,
}: {
  orgSlug: string;
  rules: ReminderRule[];
}) {
  const router = useRouter();
  const [, startToggle] = useTransition();

  if (rules.length === 0) {
    return (
      <p className="text-list-meta">
        No reminder rules yet. Run the latest database migration.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {rules.map((rule) => (
        <li key={rule.id} className="flex items-center justify-between gap-3 px-3 py-3">
          <div>
            <p className="text-list-primary">
              {rule.daysAfterDue === 0
                ? "When arrears appear"
                : `${rule.daysAfterDue} days in arrears`}
            </p>
            <p className="text-list-meta capitalize">
              {rule.channel.replace("_", " ")} notification
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={() => {
                startToggle(async () => {
                  const result = await toggleReminderRule(
                    orgSlug,
                    rule.id,
                    !rule.enabled
                  );
                  if (result.error) toast.error(result.error);
                  else router.refresh();
                });
              }}
            />
            On
          </label>
        </li>
      ))}
    </ul>
  );
}
