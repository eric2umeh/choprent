"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PropertyForm } from "@/components/properties/property-form";
import { PropertiesOverview } from "@/components/properties/properties-overview";
import { AddUnitsInfoBanner } from "@/components/properties/add-units-info-banner";
import { UnitsList } from "@/components/units/units-list";
import type { PropertySummary } from "@/lib/data/property-types";
import type { UnitListItem } from "@/lib/data/unit-types";
import { formatSiteType } from "@/lib/data/property-types";
import { Pencil, Plus } from "lucide-react";

export function PropertiesPageClient({
  orgSlug,
  properties,
  canManage,
  singleProperty,
  units = [],
}: {
  orgSlug: string;
  properties: PropertySummary[];
  canManage: boolean;
  singleProperty?: PropertySummary | null;
  units?: UnitListItem[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PropertySummary | null>(null);

  if (singleProperty) {
    return (
      <div>
        <PageHeader
          title={singleProperty.name}
          description={`${formatSiteType(singleProperty.siteType)} · ${units.length} ${units.length === 1 ? "unit" : "units"}`}
          action={
            canManage ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
                  onClick={() => setEditing(singleProperty)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit property
                </button>
                <Link
                  href={`/d/${orgSlug}/properties/${singleProperty.id}/units/new`}
                  className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add unit / shop
                </Link>
              </div>
            ) : undefined
          }
        />

        <AddUnitsInfoBanner
          orgSlug={orgSlug}
          propertyId={singleProperty.id}
          canManage={canManage}
          unitCount={units.length}
          compact
        />

        <UnitsList
          orgSlug={orgSlug}
          propertyId={singleProperty.id}
          canAdd={canManage}
          units={units}
        />

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
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Properties & units"
        description="Plazas, estates, malls, and houses — add shops and units inside each property"
        action={
          canManage ? (
            <button
              type="button"
              className="btn-primary px-3 py-1.5"
              onClick={() => setShowAdd(true)}
            >
              Add property
            </button>
          ) : undefined
        }
      />

      {canManage && properties.length > 0 && (
        <AddUnitsInfoBanner
          orgSlug={orgSlug}
          canManage={canManage}
          unitCount={properties.reduce((sum, p) => sum + p.unitCount, 0)}
        />
      )}

      <div className="overflow-hidden border-y border-border bg-white">
        <PropertiesOverview
          orgSlug={orgSlug}
          properties={properties}
          canManage={canManage}
        />
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add property"
        description="Each plaza, estate, or building is managed separately."
      >
        <PropertyForm orgSlug={orgSlug} onSaved={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}
