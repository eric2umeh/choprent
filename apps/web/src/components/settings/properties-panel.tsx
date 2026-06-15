"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PropertyForm } from "@/components/settings/property-form";
import type { PropertySummary } from "@/lib/data/property-types";
import { formatSiteType } from "@/lib/data/property-types";
import { Building2, Pencil, Plus } from "lucide-react";

export function PropertiesPanel({
  orgSlug,
  properties,
  canManage,
}: {
  orgSlug: string;
  properties: PropertySummary[];
  canManage: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(properties.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingProperty =
    editingId != null
      ? properties.find((property) => property.id === editingId) ?? null
      : null;

  return (
    <div className="space-y-4">
      {properties.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          No properties yet. A landlord can manage many — plazas, estates, standalone
          houses, and more. Add your first property below.
        </p>
      ) : (
        <ul className="space-y-2">
          {properties.map((property) => (
            <li
              key={property.id}
              className="interactive-lift rounded-xl border border-border bg-surface-subtle px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-green-700" />
                    <p className="truncate text-sm font-semibold text-foreground">
                      {property.name}
                    </p>
                  </div>
                  <p className="mt-1 text-cell-muted">
                    {[property.addressLine1, property.city, property.state]
                      .filter(Boolean)
                      .join(" · ") || "No address on file"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant="muted" className="text-[10px]">
                    {formatSiteType(property.siteType)}
                  </Badge>
                  {canManage && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 hover:text-green-800"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingId(
                          editingId === property.id ? null : property.id
                        );
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      {editingId === property.id ? "Cancel" : "Edit"}
                    </button>
                  )}
                </div>
              </div>

              {canManage && editingId === property.id && (
                <div className="mt-4 border-t border-border pt-4">
                  <PropertyForm
                    orgSlug={orgSlug}
                    property={property}
                    onSaved={() => setEditingId(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          {!showAddForm && properties.length > 0 && (
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-2 px-3 py-2"
              onClick={() => {
                setEditingId(null);
                setShowAddForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add another property
            </button>
          )}

          {showAddForm && (
            <div className="rounded-xl border border-border bg-white p-4">
              {properties.length > 0 && (
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    New property
                  </h3>
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-foreground"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <PropertyForm
                orgSlug={orgSlug}
                property={null}
                onSaved={() => setShowAddForm(false)}
              />
            </div>
          )}
        </>
      )}

      {!canManage && properties.length === 0 && (
        <p className="text-sm text-muted">
          No properties set up yet. Ask your landlord to add them in Settings.
        </p>
      )}
    </div>
  );
}
