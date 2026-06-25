"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteUnit,
  setupUnitDetails,
  type UnitActionState,
} from "@/lib/actions/units";
import {
  PROPERTY_TYPE_OPTIONS,
  type UnitDetail,
} from "@/lib/data/unit-types";
import { FormPanel } from "@/components/ui/form-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Trash2 } from "lucide-react";

const initial: UnitActionState = {};

export function UnitEditForm({
  orgSlug,
  propertyId,
  unit,
  canDelete = false,
  onSaved,
}: {
  orgSlug: string;
  propertyId: string;
  unit: UnitDetail;
  canDelete?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    setupUnitDetails.bind(null, orgSlug, unit.id),
    initial
  );
  const [deleting, startDelete] = useTransition();
  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
      lastError.current = state.error;
    }
    if (state.success) {
      toast.success("Unit saved.");
      router.refresh();
      onSaved?.();
    }
  }, [state.error, state.success, onSaved, router]);

  async function handleDelete() {
    const { confirmed } = await confirmDialog({
      title: "Delete unit?",
      message: `Delete unit ${unit.unitCode}? This removes leases and ledger history for this unit.`,
      confirmLabel: "Delete unit",
      destructive: true,
    });
    if (!confirmed) return;
    startDelete(async () => {
      const result = await deleteUnit(orgSlug, unit.id, propertyId);
      if (result.error) toast.error(result.error);
      else toast.success("Unit deleted.");
    });
  }

  return (
    <FormPanel>
      <form action={formAction} className="space-y-4">
        <p className="text-form-hint">
          Set tenant, annual rent, service charge %, VAT, and billing cadence. Ledger
          periods regenerate when you save (monthly, quarterly, or annual).
        </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-label normal-case">Unit code</label>
          <input
            name="unit_code"
            required
            defaultValue={unit.unitCode}
            className="input-field mt-1"
            disabled={pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Unit type</label>
          <select
            name="property_type"
            defaultValue={unit.propertyType}
            className="input-field mt-1"
            disabled={pending}
          >
            {PROPERTY_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-label normal-case">Status</label>
        <select
          name="status"
          defaultValue={unit.status}
          className="input-field mt-1"
          disabled={pending || !!unit.tenantName}
        >
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
        </select>
        {unit.tenantName && (
          <p className="mt-1 text-[11px] text-muted">
            Status follows tenant assignment when a tenant name is saved.
          </p>
        )}
      </div>

      <div>
        <label className="text-label normal-case">Composite note (optional)</label>
        <input
          name="composite_note"
          defaultValue={unit.compositeNote ?? ""}
          className="input-field mt-1"
          disabled={pending}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface-subtle/40 p-3">
        <h3 className="text-sm font-semibold text-foreground">Tenant &amp; billing</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-label normal-case">Tenant name</label>
            <input
              name="tenant_display_name"
              defaultValue={unit.tenantName ?? ""}
              className="input-field mt-1"
              placeholder="Chidi Traders Ltd"
              disabled={pending}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-label normal-case">Phone</label>
              <input
                name="tenant_phone"
                defaultValue={unit.tenantPhone ?? ""}
                className="input-field mt-1"
                disabled={pending}
              />
            </div>
            <div>
              <label className="text-label normal-case">Email (portal login)</label>
              <input
                name="tenant_email"
                type="email"
                defaultValue={unit.tenantEmail ?? ""}
                className="input-field mt-1"
                placeholder="tenant@example.com"
                disabled={pending}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-label normal-case">Annual rent (₦)</label>
              <input
                name="annual_rent_ngn"
                type="number"
                step="any"
                defaultValue={
                  unit.billingProfile.baseRentNgn > 0
                    ? unit.billingProfile.baseRentNgn
                    : unit.annualRent > 0
                      ? unit.annualRent
                      : ""
                }
                className="input-field mt-1"
                placeholder="1200000"
                disabled={pending}
              />
            </div>
            <div>
              <label className="text-label normal-case">Billing cadence</label>
              <select
                name="billing_cadence"
                defaultValue={unit.billingCadence}
                className="input-field mt-1"
                disabled={pending}
              >
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-label normal-case">Service charge (%)</label>
              <input
                name="service_pct"
                type="number"
                step="any"
                defaultValue={unit.billingProfile.servicePct || ""}
                className="input-field mt-1"
                placeholder="10"
                disabled={pending}
              />
            </div>
            <div>
              <label className="text-label normal-case">Agency fee (₦ / year)</label>
              <input
                name="agency_fee_ngn"
                type="number"
                step="any"
                defaultValue={unit.billingProfile.agencyFeeNgn || ""}
                className="input-field mt-1"
                placeholder="50000"
                disabled={pending}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-label normal-case">VAT (%)</label>
              <input
                name="vat_pct"
                type="number"
                step="any"
                defaultValue={unit.billingProfile.vatPct || ""}
                className="input-field mt-1"
                placeholder="7.5"
                disabled={pending}
              />
            </div>
            <div>
              <label className="text-label normal-case">Diesel (₦ / year)</label>
              <input
                name="diesel_ngn"
                type="number"
                step="any"
                defaultValue={unit.billingProfile.dieselNgn || ""}
                className="input-field mt-1"
                placeholder="120000"
                disabled={pending}
              />
            </div>
            <div>
              <label className="text-label normal-case">Security (₦)</label>
              <input
                name="security_ngn"
                type="number"
                step="any"
                defaultValue={unit.billingProfile.securityNgn || ""}
                className="input-field mt-1"
                placeholder="100000"
                disabled={pending}
              />
              <p className="mt-0.5 text-[11px] text-muted">Charged on first period only</p>
            </div>
          </div>
          <div>
            <label className="text-label normal-case">Opening arrears (₦)</label>
            <input
              name="arrears_ngn"
              type="number"
              step="any"
              defaultValue={unit.arrears}
              className="input-field mt-1"
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <LoadingButton
          type="submit"
          loading={pending}
          className="btn-primary flex-1 py-2.5 sm:flex-none sm:px-6"
        >
          Save unit
        </LoadingButton>
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending || deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Delete unit
          </button>
        )}
      </div>
      </form>
    </FormPanel>
  );
}
