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
  onSaved,
  submitLabel,
}: {
  orgSlug: string;
  property?: PropertySummary | null;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveProperty.bind(null, orgSlug),
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
    if (state.success) {
      const key = property?.id ?? "new";
      if (lastSuccess.current === key) return;
      lastSuccess.current = key;
      toast.success(
        property ? "Property updated." : "Property added — add units inside it."
      );
      onSaved?.();
      router.refresh();
    }
  }, [state.success, property, onSaved, router]);

  return (
    <form action={formAction} className="space-y-4">
      {property?.id && (
        <input type="hidden" name="property_id" value={property.id} />
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
