"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PropertyForm } from "@/components/properties/property-form";
import { AddUnitsInfoBanner } from "@/components/properties/add-units-info-banner";
import { UnitsList } from "@/components/units/units-list";
import { NewUnitForm } from "@/components/units/new-unit-form";
import { deleteProperty } from "@/lib/actions/sites";
import type { PropertySummary } from "@/lib/data/property-types";
import type { UnitListItem } from "@/lib/data/unit-types";
import { formatSiteType } from "@/lib/data/property-types";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";

export function PropertyDetailPageClient({
  orgSlug,
  property,
  units,
  canManage,
}: {
  orgSlug: string;
  property: PropertySummary;
  units: UnitListItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [, startDelete] = useTransition();

  function handleDeleteProperty() {
    if (
      !window.confirm(
        `Delete ${property.name}? All units and records under this property will be removed.`
      )
    ) {
      return;
    }
    startDelete(async () => {
      const result = await deleteProperty(orgSlug, property.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Property deleted.");
        router.push(`/d/${orgSlug}/properties`);
      }
    });
  }

  return (
    <div>
      <PageHeader
        title={property.name}
        description={`${formatSiteType(property.siteType)} · ${units.length} ${units.length === 1 ? "unit" : "units"}`}
        action={
          <div className="flex flex-wrap items-center gap-1">
            <Link href={`/d/${orgSlug}/properties`} className="btn-ghost px-3 py-1.5">
              ← All properties
            </Link>
            {canManage && (
              <>
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  className="icon-btn-danger"
                  title="Delete property"
                  onClick={handleDeleteProperty}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5"
                  onClick={() => setShowAddUnit(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add unit
                </button>
              </>
            )}
          </div>
        }
      />

      <AddUnitsInfoBanner
        propertyId={property.id}
        canManage={canManage}
        unitCount={units.length}
        compact
        onAddUnit={canManage ? () => setShowAddUnit(true) : undefined}
      />

      <UnitsList
        orgSlug={orgSlug}
        propertyId={property.id}
        canAdd={canManage}
        units={units}
        onAddUnit={canManage ? () => setShowAddUnit(true) : undefined}
      />

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit property"
        description="Update name, address, or logo."
      >
        <PropertyForm
          orgSlug={orgSlug}
          property={property}
          onSaved={() => setEditing(false)}
        />
      </Modal>

      <Modal
        open={showAddUnit}
        onClose={() => setShowAddUnit(false)}
        title="Add unit / shop"
        description={`New unit in ${property.name}`}
      >
        <NewUnitForm
          key={showAddUnit ? "add-unit-open" : "add-unit-closed"}
          orgSlug={orgSlug}
          propertyId={property.id}
          propertyName={property.name}
          stayOnPage
          onSaved={() => setShowAddUnit(false)}
        />
      </Modal>
    </div>
  );
}
