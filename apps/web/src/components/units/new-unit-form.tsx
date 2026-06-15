"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  createUnit,
  type UnitActionState,
} from "@/lib/actions/units";
import { PROPERTY_TYPES } from "@/lib/mock/data";
import type { PropertySummary } from "@/lib/data/property-types";
import { formatSiteType } from "@/lib/data/property-types";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

const initialState: UnitActionState = {};

export function NewUnitForm({
  orgSlug,
  properties,
}: {
  orgSlug: string;
  properties: PropertySummary[];
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
      {properties.length > 1 && (
        <div>
          <label className="text-label normal-case">Property</label>
          <select name="site_id" className="input-field mt-1" required disabled={pending}>
            <option value="">Select property…</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name} ({formatSiteType(property.siteType)})
              </option>
            ))}
          </select>
        </div>
      )}

      {properties.length === 1 && (
        <input type="hidden" name="site_id" value={properties[0].id} />
      )}

      {properties.length === 1 && (
        <p className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs text-muted">
          Adding to <span className="font-semibold text-foreground">{properties[0].name}</span>
        </p>
      )}

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
        <label className="text-label normal-case">Property type</label>
        <select
          name="property_type"
          className="input-field mt-1"
          defaultValue="shop"
          disabled={pending}
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
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
          href={`/d/${orgSlug}/units`}
          className={`btn-ghost flex-1 py-2.5 text-center ${pending ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={pending}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
