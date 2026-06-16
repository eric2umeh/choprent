"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createLease, renewLease } from "@/lib/actions/leases";
import { LoadingButton } from "@/components/ui/loading-button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import type { LeaseListItem } from "@/lib/data/leases";
import type { SettlementAccountItem } from "@/lib/data/settlement-accounts";

export function LeaseForm({
  orgSlug,
  mode,
  lease,
  vacantUnits,
  settlementAccounts,
  open,
  onClose,
}: {
  orgSlug: string;
  mode: "create" | "renew";
  lease?: LeaseListItem;
  vacantUnits: { id: string; unitCode: string; siteId: string }[];
  settlementAccounts: SettlementAccountItem[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const selectedSiteId = useMemo(() => {
    return vacantUnits.find((u) => u.id === selectedUnitId)?.siteId ?? null;
  }, [vacantUnits, selectedUnitId]);

  const accountsForUnit = useMemo(() => {
    if (!selectedSiteId) return [];
    return settlementAccounts.filter((a) => a.siteId === selectedSiteId);
  }, [settlementAccounts, selectedSiteId]);

  const defaultAccountId =
    accountsForUnit.find((a) => a.isDefault)?.id ??
    accountsForUnit[0]?.id ??
    "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result =
      mode === "create"
        ? await createLease(orgSlug, {}, formData)
        : await renewLease(orgSlug, lease!.id, {}, formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? "Lease created." : "Lease renewed.");
    router.refresh();
    onClose();
  }

  const nextYear = new Date().getFullYear() + 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Assign tenant" : `Renew · ${lease?.unitCode}`}
      description={
        mode === "create"
          ? "Create an active lease on a vacant unit."
          : "End the current lease and start a new term."
      }
      preventClose={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "create" && (
          <>
            <div>
              <label className="text-label normal-case">Unit</label>
              <select
                name="unit_id"
                required
                className="input-field mt-1"
                disabled={loading}
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
              >
                <option value="">Select unit…</option>
                {vacantUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unitCode}
                  </option>
                ))}
              </select>
            </div>
            {accountsForUnit.length > 0 && (
              <div>
                <label className="text-label normal-case">Rent collection account</label>
                <select
                  name="settlement_account_id"
                  className="input-field mt-1"
                  defaultValue={defaultAccountId}
                  disabled={loading}
                >
                  {accountsForUnit.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} · {a.accountNumber}
                      {a.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-label normal-case">Tenant name</label>
              <input
                name="tenant_display_name"
                required
                disabled={loading}
                className="input-field mt-1"
                placeholder="Chidi Traders Ltd"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-label normal-case">Phone</label>
                <input
                  name="tenant_phone"
                  disabled={loading}
                  className="input-field mt-1"
                  placeholder="+234…"
                />
              </div>
              <div>
                <label className="text-label normal-case">
                  Email (optional)
                </label>
                <input
                  name="tenant_email"
                  type="email"
                  disabled={loading}
                  className="input-field mt-1"
                  placeholder="tenant@example.com"
                />
              </div>
            </div>
          </>
        )}

        {mode === "renew" && lease && (
          <p className="text-sm text-muted">
            Tenant:{" "}
            <span className="font-medium text-foreground">
              {lease.tenantName}
            </span>
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-label normal-case">Start date</label>
            <input
              name="start_date"
              type="date"
              required
              disabled={loading}
              defaultValue={
                mode === "renew"
                  ? `${nextYear}-01-01`
                  : new Date().toISOString().slice(0, 10)
              }
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-label normal-case">End date</label>
            <input
              name="end_date"
              type="date"
              required
              disabled={loading}
              defaultValue={`${nextYear}-12-31`}
              className="input-field mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-label normal-case">Billing cadence</label>
          <select
            name="billing_cadence"
            defaultValue={lease?.billingCadence ?? "annual"}
            className="input-field mt-1"
            disabled={loading}
          >
            <option value="annual">Annual</option>
            <option value="quarterly">Quarterly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <LoadingButton
          type="submit"
          loading={loading}
          className="btn-primary w-full"
        >
          {mode === "create" ? "Create lease" : "Renew lease"}
        </LoadingButton>
      </form>
    </Modal>
  );
}
