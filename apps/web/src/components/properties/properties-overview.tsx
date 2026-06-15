"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PropertyForm } from "@/components/properties/property-form";
import type { PropertySummary } from "@/lib/data/property-types";
import { formatSiteType } from "@/lib/data/property-types";
import { Building2, ChevronRight, Pencil } from "lucide-react";

export function PropertiesOverview({
  orgSlug,
  properties,
  canManage,
}: {
  orgSlug: string;
  properties: PropertySummary[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<PropertySummary | null>(null);

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
            <div className="flex items-start justify-between gap-3">
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
                <Badge variant="muted" className="text-[10px]">
                  {formatSiteType(property.siteType)}
                </Badge>
                {canManage && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700"
                    onClick={() => setEditing(property)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
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
