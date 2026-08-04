"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { UnitEditForm } from "@/components/units/unit-edit-form";
import type { UnitDetail } from "@/lib/data/unit-types";
import type { SettlementAccountItem } from "@/lib/settlement/format-account";
import { Pencil } from "lucide-react";

export function UnitDetailClient({
  orgSlug,
  propertyId,
  unit,
  settlementAccounts = [],
  canEdit,
  canDelete = false,
  children,
}: {
  orgSlug: string;
  propertyId: string;
  unit: UnitDetail;
  settlementAccounts?: SettlementAccountItem[];
  canEdit: boolean;
  canDelete?: boolean;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      {canEdit && (
        <div className="border-b border-border bg-white px-3 py-2">
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
            Edit unit
          </button>
        </div>
      )}

      {children}

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={`Edit unit ${unit.unitCode}`}
        description="Update tenant, rent, status, or remove this unit."
      >
        <UnitEditForm
          orgSlug={orgSlug}
          propertyId={propertyId}
          unit={unit}
          settlementAccounts={settlementAccounts}
          canDelete={canDelete}
          onSaved={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}
