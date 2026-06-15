"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  saveSettlementAccount,
  type SettlementActionState,
} from "@/lib/actions/settlement-accounts";
import type { SettlementAccountItem } from "@/lib/data/settlement-accounts";
import type { PropertySummary } from "@/lib/data/property-types";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

const initial: SettlementActionState = {};

export function SettlementAccountsPanel({
  orgSlug,
  accounts,
  properties,
  canManage,
}: {
  orgSlug: string;
  accounts: SettlementAccountItem[];
  properties: PropertySummary[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveSettlementAccount.bind(null, orgSlug),
    initial
  );
  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
      lastError.current = state.error;
    }
    if (state.success) {
      toast.success("Settlement account saved.");
      router.refresh();
    }
  }, [state.error, state.success, router]);

  return (
    <div className="space-y-6">
      {accounts.length === 0 ? (
        <p className="text-empty-state">No settlement accounts yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {accounts.map((account) => (
            <li key={account.id} className="px-3 py-3">
              <p className="text-list-primary">{account.propertyName}</p>
              <p className="mt-0.5 font-mono text-sm">{account.accountNumber}</p>
              <p className="text-list-meta">
                {account.bankName} · {account.accountName}
                {account.isDefault ? " · Default" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canManage && properties.length > 0 && (
        <form action={formAction} className="max-w-lg space-y-3 rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold">Add settlement account</h3>
          <div>
            <label className="text-label normal-case">Property</label>
            <select name="site_id" required className="input-field mt-1" disabled={pending}>
              <option value="">Select property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label normal-case">Bank name</label>
            <input name="bank_name" required className="input-field mt-1" placeholder="GTBank" disabled={pending} />
          </div>
          <div>
            <label className="text-label normal-case">Account number</label>
            <input name="account_number" required className="input-field mt-1" disabled={pending} />
          </div>
          <div>
            <label className="text-label normal-case">Account name</label>
            <input name="account_name" required className="input-field mt-1" disabled={pending} />
          </div>
          <div>
            <label className="text-label normal-case">Label</label>
            <input name="label" className="input-field mt-1" defaultValue="Main rent" disabled={pending} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_default" disabled={pending} />
            Default for this property
          </label>
          <LoadingButton type="submit" loading={pending} className="btn-primary px-4 py-2">
            Save account
          </LoadingButton>
        </form>
      )}

      {!canManage && (
        <p className="text-list-meta">Only the landlord can manage settlement accounts.</p>
      )}
    </div>
  );
}
