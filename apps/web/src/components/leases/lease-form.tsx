"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createLease,
  renewLease,
  updateActiveLease,
} from "@/lib/actions/leases";
import { LoadingButton } from "@/components/ui/loading-button";
import { DocumentUploadField } from "@/components/ui/document-upload-field";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "@/components/ui/toast";
import type { LeaseListItem } from "@/lib/data/leases";
import {
  anniversaryEndDate,
  defaultAnnualLeaseRange,
  parseDate,
  toIsoDate,
} from "@/lib/charges/period-ranges";
import {
  formatSettlementAccountLabel,
  type SettlementAccountItem,
} from "@/lib/settlement/format-account";

function dayAfter(iso: string): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + 1);
  return toIsoDate(d);
}

export function LeaseForm({
  orgSlug,
  mode,
  lease,
  vacantUnits = [],
  settlementAccounts,
  open,
  onClose,
}: {
  orgSlug: string;
  mode: "create" | "renew" | "edit";
  lease?: LeaseListItem;
  vacantUnits?: {
    id: string;
    unitCode: string;
    siteId: string;
    settlementAccountId?: string | null;
  }[];
  settlementAccounts: SettlementAccountItem[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const initialDates = useMemo(() => {
    if (mode === "edit" && lease) {
      return { start: lease.startDate, end: lease.endDate };
    }
    if (mode === "renew" && lease) {
      const start = dayAfter(lease.endDate);
      return { start, end: anniversaryEndDate(start, 1) };
    }
    return defaultAnnualLeaseRange();
  }, [mode, lease]);

  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);

  useEffect(() => {
    if (!open) return;
    setStartDate(initialDates.start);
    setEndDate(initialDates.end);
  }, [open, initialDates.start, initialDates.end]);

  const selectedSiteId = useMemo(() => {
    if (mode !== "create" && lease) return lease.propertyId;
    return vacantUnits.find((u) => u.id === selectedUnitId)?.siteId ?? null;
  }, [vacantUnits, selectedUnitId, mode, lease]);

  const accountsForUnit = useMemo(() => {
    if (!selectedSiteId) return [];
    return settlementAccounts.filter((a) => a.siteId === selectedSiteId);
  }, [settlementAccounts, selectedSiteId]);

  const defaultAccountId = useMemo(() => {
    if (mode !== "create" && lease?.settlementAccountId) {
      return lease.settlementAccountId;
    }
    const unitAccountId = vacantUnits.find(
      (u) => u.id === selectedUnitId
    )?.settlementAccountId;
    if (unitAccountId) return unitAccountId;
    return (
      accountsForUnit.find((a) => a.isDefault)?.id ??
      accountsForUnit[0]?.id ??
      ""
    );
  }, [
    mode,
    lease?.settlementAccountId,
    vacantUnits,
    selectedUnitId,
    accountsForUnit,
  ]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result =
      mode === "create"
        ? await createLease(orgSlug, {}, formData)
        : mode === "renew"
          ? await renewLease(orgSlug, lease!.id, {}, formData)
          : await updateActiveLease(orgSlug, lease!.id, {}, formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    const successMessage =
      mode === "create"
        ? "Lease created."
        : mode === "renew"
          ? "Lease renewed."
          : "Lease updated.";
    toast.success(successMessage);
    router.refresh();
    onClose();
  }

  const title =
    mode === "create"
      ? "Assign tenant"
      : mode === "renew"
        ? `Renew · ${lease?.unitCode}`
        : `Edit lease · ${lease?.unitCode}`;

  const description =
    mode === "create"
      ? "Create an active lease on a vacant unit."
      : mode === "renew"
        ? "End the current lease and start a new term."
        : "Update tenancy dates, contact details, billing, or collection account.";

  const submitLabel =
    mode === "create"
      ? "Create lease"
      : mode === "renew"
        ? "Renew lease"
        : "Save changes";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      preventClose={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "create" && (
          <>
            <div>
              <label className="text-label normal-case">Unit</label>
              <SearchableSelect
                name="unit_id"
                options={vacantUnits.map((u) => ({
                  value: u.id,
                  label: u.unitCode,
                }))}
                value={selectedUnitId}
                onValueChange={setSelectedUnitId}
                emptyLabel="Search unit…"
                placeholder="Type unit code…"
                required
                disabled={loading}
                className="mt-1"
              />
            </div>
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

        {mode === "edit" && lease && (
          <>
            <p className="text-sm text-muted">
              Unit{" "}
              <span className="font-medium text-foreground">{lease.unitCode}</span>
              {" · "}
              {lease.propertyName}
            </p>
            <div>
              <label className="text-label normal-case">Tenant name</label>
              <input
                name="tenant_display_name"
                required
                disabled={loading}
                defaultValue={lease.tenantName}
                className="input-field mt-1"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-label normal-case">Phone</label>
                <input
                  name="tenant_phone"
                  disabled={loading}
                  defaultValue={lease.tenantPhone ?? ""}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="text-label normal-case">Email</label>
                <input
                  name="tenant_email"
                  type="email"
                  disabled={loading}
                  defaultValue={lease.tenantEmail ?? ""}
                  className="input-field mt-1"
                />
              </div>
            </div>
          </>
        )}

        {accountsForUnit.length > 0 && (
          <div>
            <label className="text-label normal-case">
              Rent collection Bank Account
            </label>
            <select
              key={`${mode}-${selectedUnitId}-${defaultAccountId}`}
              name="settlement_account_id"
              className="input-field mt-1"
              defaultValue={defaultAccountId}
              disabled={loading}
            >
              <option value="">
                {(() => {
                  const fallback =
                    accountsForUnit.find((a) => a.isDefault) ??
                    accountsForUnit[0];
                  return fallback
                    ? `Default · ${formatSettlementAccountLabel(fallback)}`
                    : "Use unit / property default";
                })()}
              </option>
              {accountsForUnit.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatSettlementAccountLabel(a)}
                  {a.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-[11px] text-muted">
              This is the only bank account shown on the tenant portal for this
              tenancy.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-label normal-case">Start date</label>
            <input
              name="start_date"
              type="date"
              required
              disabled={loading}
              value={startDate}
              onChange={(e) => {
                const nextStart = e.target.value;
                setStartDate(nextStart);
                if (nextStart) {
                  setEndDate(anniversaryEndDate(nextStart, 1));
                }
              }}
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
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field mt-1"
            />
            <p className="mt-0.5 text-[11px] text-muted">
              Defaults to one year from start (e.g. 05-08-2026 → 04-08-2027).
            </p>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-surface-subtle/50 px-3 py-2.5">
          <input
            type="checkbox"
            name="fixed_end_date"
            value="on"
            defaultChecked={lease ? lease.autoRenew === false : false}
            disabled={loading}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Fixed end date (manual renewal)
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              Leave unchecked (default) to auto-renew each year after the end
              date. Check this if the tenancy must stop on the end date until
              you renew it manually.
            </span>
          </span>
        </label>

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

        {(mode === "create" || mode === "edit") && (
          <DocumentUploadField
            disabled={loading}
            defaultDocType="tenancy_agreement"
            showTitle
          />
        )}

        <LoadingButton
          type="submit"
          loading={loading}
          className="btn-primary w-full"
        >
          {submitLabel}
        </LoadingButton>
      </form>
    </Modal>
  );
}
