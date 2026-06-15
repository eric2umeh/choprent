"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  saveProperty,
  type PropertyActionState,
} from "@/lib/actions/sites";
import type { PropertySummary } from "@/lib/data/property-types";
import { SITE_TYPE_OPTIONS } from "@/lib/data/property-types";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

const initialState: PropertyActionState = {};

export function PropertyForm({
  orgSlug,
  property,
  redirectAfter,
  onSaved,
  submitLabel,
}: {
  orgSlug: string;
  property?: PropertySummary | null;
  redirectAfter?: string;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveProperty.bind(null, orgSlug),
    initialState
  );
  const lastError = useRef<string | undefined>(undefined);
  const lastSuccess = useRef(false);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
      lastError.current = state.error;
    }
  }, [state.error]);

  useEffect(() => {
    if (state.success && !lastSuccess.current) {
      toast.success(
        property ? "Property updated." : "Property added — you can add units inside it."
      );
      lastSuccess.current = true;
      onSaved?.();
      if (redirectAfter) router.push(redirectAfter);
      else router.refresh();
    }
  }, [state.success, property, redirectAfter, onSaved, router]);

  return (
    <form action={formAction} className="space-y-4">
      {property?.id && (
        <input type="hidden" name="property_id" value={property.id} />
      )}

      {!property && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          Add each plaza, estate, or house you manage as a separate property. Units
          (shops, flats, rooms) are added inside a property — not here.
        </p>
      )}

      <div>
        <label className="text-label normal-case">Property name</label>
        <input
          name="name"
          className="input-field mt-1"
          placeholder="e.g. Eri Plaza, Lekki House 4"
          defaultValue={property?.name ?? ""}
          required
          disabled={pending}
        />
      </div>

      <div>
        <label className="text-label normal-case">Property type</label>
        <select
          name="site_type"
          className="input-field mt-1"
          defaultValue={property?.siteType ?? "plaza"}
          disabled={pending}
        >
          {SITE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-label normal-case">Street address</label>
        <input
          name="address_line1"
          className="input-field mt-1"
          placeholder="12 Allen Avenue"
          defaultValue={property?.addressLine1 ?? ""}
          disabled={pending}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-label normal-case">City</label>
          <input
            name="city"
            className="input-field mt-1"
            placeholder="Ikeja"
            defaultValue={property?.city ?? ""}
            disabled={pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">State</label>
          <input
            name="state"
            className="input-field mt-1"
            placeholder="Lagos"
            defaultValue={property?.state ?? ""}
            disabled={pending}
          />
        </div>
      </div>

      <LoadingButton
        type="submit"
        loading={pending}
        loadingLabel="Saving…"
        className="btn-primary px-4 py-2 disabled:opacity-60"
      >
        {submitLabel ?? (property ? "Save property" : "Add property")}
      </LoadingButton>
    </form>
  );
}

/** @deprecated Use PropertyForm */
export function PlazaSetupForm({
  orgSlug,
  site,
  redirectAfter,
}: {
  orgSlug: string;
  site: PropertySummary | null;
  redirectAfter?: string;
}) {
  return (
    <PropertyForm
      orgSlug={orgSlug}
      property={site}
      redirectAfter={redirectAfter}
    />
  );
}
