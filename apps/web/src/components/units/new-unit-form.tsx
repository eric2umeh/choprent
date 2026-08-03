"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createUnit, type UnitActionState } from "@/lib/actions/units";
import { PROPERTY_TYPE_OPTIONS } from "@/lib/data/unit-types";
import {
  formatSettlementAccountLabel,
  type SettlementAccountItem,
} from "@/lib/settlement/format-account";
import { FormPanel } from "@/components/ui/form-panel";
import { DocumentUploadField } from "@/components/ui/document-upload-field";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

const initialState: UnitActionState = {};

export function NewUnitForm({
  orgSlug,
  propertyId,
  propertyName,
  settlementAccounts = [],
  stayOnPage = false,
  onSaved,
}: {
  orgSlug: string;
  propertyId: string;
  propertyName: string;
  settlementAccounts?: SettlementAccountItem[];
  /** When true, reset form after save instead of navigating away. */
  stayOnPage?: boolean;
  onSaved?: (unitId: string) => void;
}) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    createUnit.bind(null, orgSlug),
    initialState
  );
  const lastError = useRef<string | undefined>(undefined);
  const lastSuccess = useRef<string | null>(null);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
      lastError.current = state.error;
    }
  }, [state.error]);

  useEffect(() => {
    if (!state.success || !state.unitId) return;
    if (lastSuccess.current === state.unitId) return;
    lastSuccess.current = state.unitId;

    toast.success(`Unit saved — open it to add tenant and rent.`);
    router.refresh();
    onSaved?.(state.unitId);

    if (stayOnPage) {
      setFormKey((k) => k + 1);
      lastSuccess.current = null;
    }
  }, [state.success, state.unitId, stayOnPage, onSaved, router]);

  return (
    <FormPanel key={formKey}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="site_id" value={propertyId} />
        {stayOnPage && <input type="hidden" name="stay_on_page" value="1" />}

        <p className="rounded-lg border border-green-200 bg-green-50/60 px-3 py-2 text-form-hint">
          Adding to{" "}
          <span className="font-bold text-foreground">{propertyName}</span>
        </p>

        <div>
          <label className="text-label normal-case">Unit code</label>
          <input
            name="unit_code"
            className="input-field mt-1.5"
            placeholder="e.g. 14, 14/16, Flat 3B"
            required
            disabled={pending}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-label normal-case">Unit type</label>
            <select
              name="property_type"
              className="input-field mt-1.5"
              defaultValue="shop"
              disabled={pending}
            >
              {PROPERTY_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label normal-case">Status</label>
            <select
              name="status"
              className="input-field mt-1.5"
              defaultValue="vacant"
              disabled={pending}
            >
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-label normal-case">Composite note (optional)</label>
          <input
            name="composite_note"
            className="input-field mt-1.5"
            placeholder="Shops 14 and 16 combined"
            disabled={pending}
          />
        </div>

        {settlementAccounts.length > 0 && (
          <div>
            <label className="text-label normal-case">
              Rent collection Bank Account
            </label>
            <select
              name="settlement_account_id"
              className="input-field mt-1.5"
              defaultValue=""
              disabled={pending}
            >
              <option value="">
                {(() => {
                  const fallback =
                    settlementAccounts.find((a) => a.isDefault) ??
                    settlementAccounts[0];
                  return fallback
                    ? `Default · ${formatSettlementAccountLabel(fallback)}`
                    : "Property default";
                })()}
              </option>
              {settlementAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatSettlementAccountLabel(a)}
                  {a.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <DocumentUploadField disabled={pending} defaultDocType="other" />

        <LoadingButton
          type="submit"
          loading={pending}
          loadingLabel="Saving…"
          className="btn-primary w-full py-2.5 disabled:opacity-60 sm:w-auto sm:px-6"
        >
          Save unit
        </LoadingButton>
      </form>
    </FormPanel>
  );
}
