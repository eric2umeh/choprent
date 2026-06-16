"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProperty,
  saveProperty,
  type PropertyActionState,
} from "@/lib/actions/sites";
import type { PropertySummary } from "@/lib/data/property-types";
import { SITE_TYPE_OPTIONS } from "@/lib/data/property-types";
import { FormPanel } from "@/components/ui/form-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";
import { Trash2 } from "lucide-react";

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
  const [, startDelete] = useTransition();
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

  function handleDelete() {
    if (!property?.id) return;
    if (
      !window.confirm(
        `Delete ${property.name}? All units, leases, and records under this property will be removed.`
      )
    ) {
      return;
    }
    startDelete(async () => {
      const result = await deleteProperty(orgSlug, property.id);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <FormPanel>
      <form action={formAction} encType="multipart/form-data" className="space-y-4">
      {property?.id && (
        <input type="hidden" name="property_id" value={property.id} />
      )}

      <div>
        <label className="text-label normal-case">Property name</label>
        <input
          name="name"
          className="input-field mt-1.5"
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
          className="input-field mt-1.5"
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

      <div>
        <label className="text-label normal-case">Property logo (optional)</label>
        <input
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-1 block w-full text-sm"
          disabled={pending}
        />
        <p className="mt-1 text-[11px] text-muted">
          Shown to tenants on their portal — JPG, PNG, or WebP, max 2MB.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <LoadingButton
          type="submit"
          loading={pending}
          loadingLabel="Saving…"
          className="btn-primary px-4 py-2 disabled:opacity-60"
        >
          {submitLabel ?? (property ? "Save property" : "Add property")}
        </LoadingButton>
        {property?.id && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Delete property
          </button>
        )}
      </div>
      </form>
    </FormPanel>
  );
}
