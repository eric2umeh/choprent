"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { provisionUnitVirtualAccount } from "@/lib/actions/virtual-accounts";
import type { VirtualAccountRow } from "@/lib/paystack/provision-unit-dva";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";

export function DvaPanel({
  orgSlug,
  accounts,
  paystackConfigured,
}: {
  orgSlug: string;
  accounts: VirtualAccountRow[];
  paystackConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [provisioningId, setProvisioningId] = useState<string | null>(null);

  const configured = paystackConfigured;

  function handleProvision(unitId: string) {
    setProvisioningId(unitId);
    startTransition(async () => {
      const result = await provisionUnitVirtualAccount(orgSlug, unitId);
      setProvisioningId(null);
      if (result.error) toast.error(result.error);
      else {
        toast.success(
          configured
            ? "Dedicated account provisioned via Paystack."
            : "Mock DVA created (add PAYSTACK_SECRET_KEY for live NUBANs)."
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4 px-3 py-4 lg:px-0">
      <p className="text-list-secondary">
        Each shop gets a stable NUBAN. Tenants transfer without uploading receipts;
        Paystack webhooks auto-record payments.
      </p>
      {!configured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Paystack not configured — provisioning creates mock accounts for testing.
          Add <code className="text-xs">PAYSTACK_SECRET_KEY</code> to your env.
        </p>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border bg-white">
        {accounts.map((row) => (
          <li key={row.unitId} className="px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-list-primary">
                  Unit {row.unitCode}
                  <span className="text-list-meta"> · {row.propertyName}</span>
                </p>
                {row.accountNumber ? (
                  <div className="mt-1">
                    <p className="font-mono text-sm font-semibold">{row.accountNumber}</p>
                    <p className="text-list-meta">
                      {row.bankName} · {row.accountName}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-list-meta">No dedicated account yet</p>
                )}
              </div>
              {!row.accountNumber && (
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={pending}
                  onClick={() => handleProvision(row.unitId)}
                >
                  {provisioningId === row.unitId ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    "Provision NUBAN"
                  )}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {accounts.length === 0 && (
        <p className="text-list-meta">Add units to your property first.</p>
      )}

      <p className="text-form-hint">
        Webhook URL: <code className="text-xs">/api/webhooks/paystack</code> — register in
        Paystack dashboard.
      </p>
    </div>
  );
}
