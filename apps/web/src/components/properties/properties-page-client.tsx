"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PropertyForm } from "@/components/properties/property-form";
import { PropertiesOverview } from "@/components/properties/properties-overview";
import { AddUnitsInfoBanner } from "@/components/properties/add-units-info-banner";
import { UnitsList } from "@/components/units/units-list";
import { NewUnitForm } from "@/components/units/new-unit-form";
import { AddDocumentModal } from "@/components/documents/add-document-modal";
import { deleteProperty } from "@/lib/actions/sites";
import type { PropertySummary } from "@/lib/data/property-types";
import type { UnitListItem } from "@/lib/data/unit-types";
import type { SettlementAccountItem } from "@/lib/settlement/format-account";
import { formatSiteType } from "@/lib/data/property-types";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";

export function PropertiesPageClient({
  orgSlug,
  properties,
  canManage,
  singleProperty,
  units = [],
  settlementAccounts = [],
  paystackDvaEnabled = false,
  canManageDocuments = false,
}: {
  orgSlug: string;
  properties: PropertySummary[];
  canManage: boolean;
  singleProperty?: PropertySummary | null;
  units?: UnitListItem[];
  settlementAccounts?: SettlementAccountItem[];
  paystackDvaEnabled?: boolean;
  canManageDocuments?: boolean;
}) {
  const router = useRouter();
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [editing, setEditing] = useState<PropertySummary | null>(null);
  const [, startDelete] = useTransition();

  async function handleDeleteProperty(property: PropertySummary) {
    const { confirmed } = await confirmDialog({
      title: "Delete property?",
      message: `Delete ${property.name}? All units and records under this property will be removed.`,
      confirmLabel: "Delete property",
      destructive: true,
    });
    if (!confirmed) return;
    startDelete(async () => {
      const result = await deleteProperty(orgSlug, property.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Property deleted.");
        router.refresh();
      }
    });
  }

  if (singleProperty) {
    return (
      <div>
        <PageHeader
          title={singleProperty.name}
          description={`${formatSiteType(singleProperty.siteType)} · ${units.length} ${units.length === 1 ? "unit" : "units"}`}
          imageUrl={singleProperty.logoUrl}
          imageAlt={`${singleProperty.name} logo`}
          action={
            canManage ? (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
                  onClick={() => setEditing(singleProperty)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit property
                </button>
                <button
                  type="button"
                  className="icon-btn-danger"
                  title="Delete property"
                  onClick={() => handleDeleteProperty(singleProperty)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5"
                  onClick={() => setShowAddProperty(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add property
                </button>
                {canManageDocuments && (
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5"
                    onClick={() => setShowAddDocument(true)}
                  >
                    Add document
                  </button>
                )}
              </div>
            ) : undefined
          }
        />

        <AddUnitsInfoBanner
          propertyId={singleProperty.id}
          canManage={canManage}
          unitCount={units.length}
          compact
          onAddUnit={canManage ? () => setShowAddUnit(true) : undefined}
        />

        <UnitsList
          orgSlug={orgSlug}
          propertyId={singleProperty.id}
          propertySlug={singleProperty.slug}
          propertyName={singleProperty.name}
          canAdd={canManage}
          units={units}
          onAddUnit={canManage ? () => setShowAddUnit(true) : undefined}
          showShopAccountColumn={paystackDvaEnabled}
        />

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
              logoUrl={editing.logoUrl}
              onSaved={() => setEditing(null)}
            />
          )}
        </Modal>

        <Modal
          open={showAddProperty}
          onClose={() => setShowAddProperty(false)}
          title="Add property"
          description="Each plaza, estate, or building is managed separately."
        >
          <PropertyForm orgSlug={orgSlug} onSaved={() => setShowAddProperty(false)} />
        </Modal>

        <Modal
          open={showAddUnit}
          onClose={() => setShowAddUnit(false)}
          title="Add unit / shop"
          description={`New unit in ${singleProperty.name}`}
        >
          <NewUnitForm
            key={showAddUnit ? "add-unit-open" : "add-unit-closed"}
            orgSlug={orgSlug}
            propertyId={singleProperty.id}
            propertyName={singleProperty.name}
            settlementAccounts={settlementAccounts}
            stayOnPage
            onSaved={() => setShowAddUnit(false)}
          />
        </Modal>

        {canManageDocuments && (
          <AddDocumentModal
            orgSlug={orgSlug}
            open={showAddDocument}
            onClose={() => setShowAddDocument(false)}
            properties={[{ id: singleProperty.id, name: singleProperty.name }]}
            units={units.map((u) => ({ id: u.id, unitCode: u.unitCode }))}
            defaultSiteId={singleProperty.id}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Units & Properties"
        description="Plazas, estates, malls, and houses — add shops and units inside each property"
        action={
          canManage ? (
            <div className="flex flex-wrap items-center gap-1">
              {canManageDocuments && (
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5"
                  onClick={() => setShowAddDocument(true)}
                >
                  Add document
                </button>
              )}
              <button
                type="button"
                className="btn-primary px-3 py-1.5"
                onClick={() => setShowAddProperty(true)}
              >
                Add property
              </button>
            </div>
          ) : undefined
        }
      />

      {canManage && properties.length > 0 && (
        <AddUnitsInfoBanner
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
        open={showAddProperty}
        onClose={() => setShowAddProperty(false)}
        title="Add property"
        description="Each plaza, estate, or building is managed separately."
      >
        <PropertyForm orgSlug={orgSlug} onSaved={() => setShowAddProperty(false)} />
      </Modal>

      {canManageDocuments && (
        <AddDocumentModal
          orgSlug={orgSlug}
          open={showAddDocument}
          onClose={() => setShowAddDocument(false)}
          properties={properties.map((p) => ({ id: p.id, name: p.name }))}
          units={units.map((u) => ({ id: u.id, unitCode: u.unitCode }))}
        />
      )}
    </div>
  );
}
