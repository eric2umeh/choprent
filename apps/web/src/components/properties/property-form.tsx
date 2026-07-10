"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProperty,
  saveProperty,
  uploadPropertyLogo,
} from "@/lib/actions/sites";
import type { PropertySummary } from "@/lib/data/property-types";
import { SITE_TYPE_OPTIONS } from "@/lib/data/property-types";
import { FormPanel } from "@/components/ui/form-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Trash2 } from "lucide-react";

export function PropertyForm({
  orgSlug,
  property,
  logoUrl,
  onSaved,
  submitLabel,
}: {
  orgSlug: string;
  property?: PropertySummary | null;
  logoUrl?: string | null;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [, startDelete] = useTransition();
  const lastSuccess = useRef<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const logo = formData.get("logo");
    formData.delete("logo");

    if (logo instanceof File && logo.size > 2 * 1024 * 1024) {
      toast.error("Logo must be 2MB or less.");
      return;
    }

    startTransition(async () => {
      const result = await saveProperty(orgSlug, {}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const targetId = result.propertyId ?? property?.id;
      if (logo instanceof File && logo.size > 0 && targetId) {
        const logoData = new FormData();
        logoData.set("logo", logo);
        const uploadResult = await uploadPropertyLogo(orgSlug, targetId, logoData);
        if (uploadResult.error) {
          toast.error(uploadResult.error);
          return;
        }
      }

      const key = property?.id ?? result.propertyId ?? "new";
      if (lastSuccess.current === key) return;
      lastSuccess.current = key;
      toast.success(
        property ? "Property updated." : "Property added — add units inside it."
      );
      onSaved?.();
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!property?.id) return;
    const { confirmed } = await confirmDialog({
      title: "Delete property?",
      message: `Delete ${property.name}? All units, leases, and records under this property will be removed.`,
      confirmLabel: "Delete property",
      destructive: true,
    });
    if (!confirmed) return;
    startDelete(async () => {
      const result = await deleteProperty(orgSlug, property.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Property deleted.");
        onSaved?.();
        router.refresh();
      }
    });
  }

  return (
    <FormPanel>
      <form onSubmit={handleSubmit} className="space-y-4">
        {property?.id && (
          <input type="hidden" name="property_id" value={property.id} />
        )}

        <div>
          <label className="text-label normal-case">Property name</label>
          <input
            name="name"
            className="input-field mt-1.5"
            placeholder="e.g. Sunrise Plaza, Lekki House 4"
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
          {(logoUrl ?? property?.logoUrl) && (
            <div className="mt-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl ?? property?.logoUrl ?? ""}
                alt={`${property?.name ?? "Property"} logo`}
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
            </div>
          )}
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
