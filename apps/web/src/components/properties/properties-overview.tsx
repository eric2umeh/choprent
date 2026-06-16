"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProperty } from "@/lib/actions/sites";
import type { PropertySummary } from "@/lib/data/property-types";
import { formatSiteType } from "@/lib/data/property-types";
import { Building2, ChevronRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { PropertyForm } from "@/components/properties/property-form";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

export function PropertiesOverview({
  orgSlug,
  properties,
  canManage,
}: {
  orgSlug: string;
  properties: PropertySummary[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PropertySummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  function handleDelete(property: PropertySummary) {
    if (
      !window.confirm(
        `Delete ${property.name}? All units and records under this property will be removed.`
      )
    ) {
      return;
    }
    setDeletingId(property.id);
    startDelete(async () => {
      const result = await deleteProperty(orgSlug, property.id);
      setDeletingId(null);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Property deleted.");
        router.refresh();
      }
    });
  }

  if (properties.length === 0) {
    return (
      <div className="px-3 py-10 text-center">
        <p className="text-empty-state">No properties yet.</p>
        {canManage && (
          <p className="mt-1 text-list-meta">
            Use Add property to create your first plaza, estate, or house.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {properties.map((property) => (
          <li key={property.id} className="bg-white px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/d/${orgSlug}/properties/${property.id}`}
                className="interactive-lift min-w-0 flex-1 rounded-lg p-1 -m-1"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-green-700" />
                  <p className="truncate text-list-primary">{property.name}</p>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted" />
                </div>
                <p className="mt-1 text-list-meta">
                  {[property.addressLine1, property.city, property.state]
                    .filter(Boolean)
                    .join(" · ") || "No address on file"}
                </p>
                <p className="mt-1 text-list-secondary">
                  {property.unitCount}{" "}
                  {property.unitCount === 1 ? "unit" : "units"}
                </p>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant="muted" className="text-[10px] font-semibold">
                  {formatSiteType(property.siteType)}
                </Badge>
                {canManage && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="icon-btn-muted"
                      title="Edit property"
                      onClick={() => setEditing(property)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn-danger"
                      title="Delete property"
                      disabled={deletingId === property.id}
                      onClick={() => handleDelete(property)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit property"
        description="Update name, address, or logo."
      >
        {editing && (
          <PropertyForm
            orgSlug={orgSlug}
            property={editing}
            onSaved={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}
