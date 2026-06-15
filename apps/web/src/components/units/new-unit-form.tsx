"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { createUnit, type UnitActionState } from "@/lib/actions/units";
import {
  PROPERTY_TYPE_OPTIONS,
} from "@/lib/data/unit-types";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

const initialState: UnitActionState = {};

export function NewUnitForm({
  orgSlug,
  propertyId,
  propertyName,
}: {
  orgSlug: string;
  propertyId: string;
  propertyName: string;
}) {
  const [state, formAction, pending] = useActionState(
    createUnit.bind(null, orgSlug),
    initialState
  );
  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
      lastError.current = state.error;
    }
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="site_id" value={propertyId} />
      <p className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs text-muted">
        Adding to <span className="font-semibold text-foreground">{propertyName}</span>
      </p>

      <div>
        <label className="text-label normal-case">Unit code</label>
        <input
          name="unit_code"
          className="input-field mt-1"
          placeholder="e.g. 14, 14/16, Flat 3B"
          required
          disabled={pending}
        />
        <p className="mt-1 text-[11px] text-muted">
          Supports composite numbers like 14/16 or 14 &amp; 16
        </p>
      </div>

      <div>
        <label className="text-label normal-case">Unit type</label>
        <select
          name="property_type"
          className="input-field mt-1"
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
        <label className="text-label normal-case">Composite note (optional)</label>
        <input
          name="composite_note"
          className="input-field mt-1"
          placeholder="Shops 14 and 16 combined"
          disabled={pending}
        />
      </div>

      <div>
        <label className="text-label normal-case">Status</label>
        <select
          name="status"
          className="input-field mt-1"
          defaultValue="vacant"
          disabled={pending}
        >
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <LoadingButton
          type="submit"
          loading={pending}
          loadingLabel="Saving…"
          className="btn-primary flex-1 py-2.5 disabled:opacity-60"
        >
          Save unit
        </LoadingButton>
        <Link
          href={`/d/${orgSlug}/properties/${propertyId}`}
          className={`btn-ghost flex-1 py-2.5 text-center ${pending ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={pending}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
