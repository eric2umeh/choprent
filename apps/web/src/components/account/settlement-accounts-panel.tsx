"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSettlementAccount,
  saveSettlementAccount,
  type SettlementActionState,
} from "@/lib/actions/settlement-accounts";
import type { SettlementAccountItem } from "@/lib/settlement/format-account";
import type { PropertySummary } from "@/lib/data/property-types";
import { LoadingButton } from "@/components/ui/loading-button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";

const initial: SettlementActionState = {};

function SettlementAccountForm({
  orgSlug,
  properties,
  account,
  onDone,
}: {
  orgSlug: string;
  properties: PropertySummary[];
  account?: SettlementAccountItem | null;
  onDone: () => void;
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
      toast.success(account ? "Account updated." : "Account added.");
      router.refresh();
      onDone();
    }
  }, [state.error, state.success, account, onDone, router]);

  return (
    <form action={formAction} className="space-y-3">
      {account?.id && <input type="hidden" name="account_id" value={account.id} />}
      <div>
        <label className="text-label normal-case">Property</label>
        <select
          name="site_id"
          required
          className="input-field mt-1"
          defaultValue={account?.siteId ?? ""}
          disabled={pending || !!account}
        >
          <option value="">Select property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-label normal-case">Label</label>
        <input
          name="label"
          className="input-field mt-1"
          defaultValue={account?.label ?? "Main rent"}
          placeholder="Main rent, Service charge, Diesel…"
          disabled={pending}
        />
      </div>
      <div>
        <label className="text-label normal-case">Bank name</label>
        <input
          name="bank_name"
          required
          className="input-field mt-1"
          placeholder="GTBank"
          defaultValue={account?.bankName ?? ""}
          disabled={pending}
        />
      </div>
      <div>
        <label className="text-label normal-case">Account number</label>
        <input
          name="account_number"
          required
          className="input-field mt-1"
          defaultValue={account?.accountNumber ?? ""}
          disabled={pending}
        />
      </div>
      <div>
        <label className="text-label normal-case">Account name</label>
        <input
          name="account_name"
          required
          className="input-field mt-1"
          defaultValue={account?.accountName ?? ""}
          disabled={pending}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_default"
          defaultChecked={account?.isDefault ?? false}
          disabled={pending}
        />
        Default for this property
      </label>
      <LoadingButton type="submit" loading={pending} className="btn-primary px-4 py-2">
        {account ? "Save changes" : "Add account"}
      </LoadingButton>
    </form>
  );
}

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
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<SettlementAccountItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, SettlementAccountItem[]>();
    for (const account of accounts) {
      const list = map.get(account.propertyName) ?? [];
      list.push(account);
      map.set(account.propertyName, list);
    }
    return [...map.entries()];
  }, [accounts]);

  async function handleDelete(account: SettlementAccountItem) {
    const { confirmed } = await confirmDialog({
      title: "Delete settlement account?",
      message: `Delete ${account.label} (${account.accountNumber})? Leases using this account will fall back to the property default.`,
      confirmLabel: "Delete account",
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingId(account.id);
    startTransition(async () => {
      const result = await deleteSettlementAccount(orgSlug, account.id);
      setDeletingId(null);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Account removed.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-list-secondary">
        Add multiple bank accounts per property — e.g. main rent, service charge, or diesel
        collections. Assign an account when creating a tenant lease.
      </p>

      {accounts.length === 0 ? (
        <p className="text-empty-state">No settlement accounts yet.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([propertyName, propertyAccounts]) => (
            <section
              key={propertyName}
              className="overflow-hidden rounded-xl border border-border"
            >
              <h3 className="border-b border-border bg-surface-subtle/50 px-3 py-2 text-sm font-semibold">
                {propertyName}
              </h3>
              <ul className="divide-y divide-border">
                {propertyAccounts.map((account) => (
                  <li key={account.id} className="flex items-start justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-list-primary">{account.label}</p>
                        {account.isDefault && (
                          <Badge variant="success" className="text-[10px]">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-sm">{account.accountNumber}</p>
                      <p className="text-list-meta">
                        {account.bankName} · {account.accountName}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="btn-ghost inline-flex gap-1 px-2 py-1 text-xs"
                          onClick={() => setEditing(account)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-ghost inline-flex gap-1 px-2 py-1 text-xs text-red-600"
                          disabled={deletingId === account.id}
                          onClick={() => handleDelete(account)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {canManage && properties.length > 0 && (
        <button
          type="button"
          className="btn-primary px-4 py-2"
          onClick={() => setShowAdd(true)}
        >
          Add settlement account
        </button>
      )}

      {!canManage && (
        <p className="text-list-meta">Only the landlord can manage settlement accounts.</p>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add settlement account">
        <SettlementAccountForm
          orgSlug={orgSlug}
          properties={properties}
          onDone={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit settlement account">
        {editing && (
          <SettlementAccountForm
            orgSlug={orgSlug}
            properties={properties}
            account={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
