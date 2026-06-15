"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PropertyForm } from "@/components/properties/property-form";
import { PropertiesOverview } from "@/components/properties/properties-overview";
import type { PropertySummary } from "@/lib/data/property-types";

export function PropertiesPageClient({
  orgSlug,
  properties,
  canManage,
}: {
  orgSlug: string;
  properties: PropertySummary[];
  canManage: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Plazas, estates, malls, and houses — units live inside each property"
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
