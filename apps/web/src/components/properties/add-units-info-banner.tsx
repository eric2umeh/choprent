"use client";

import { Plus, Store } from "lucide-react";

export function AddUnitsInfoBanner({
  propertyId,
  canManage,
  unitCount,
  compact,
  onAddUnit,
}: {
  propertyId?: string;
  canManage: boolean;
  unitCount?: number;
  compact?: boolean;
  onAddUnit?: () => void;
}) {
  if (!canManage) return null;

  const showAdd = Boolean(propertyId && onAddUnit);

  return (
    <div
      className={
        compact
          ? "border-b border-green-100 bg-green-50/60 px-3 py-2.5"
          : "mx-3 mb-3 rounded-xl border border-green-200 bg-green-50/70 px-4 py-3"
      }
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-800">
          <Store className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-green-900">
            {unitCount === 0
              ? "Add your first shop or unit"
              : "Shops and units live inside each property"}
          </p>
          <p className="mt-0.5 text-sm text-green-800/80">
            {unitCount === 0
              ? "Create unit codes like 14, Flat 3B, or 14/16 for combined shops."
              : "Use Add unit to register shops, flats, offices, and kiosks under this property."}
          </p>
          {showAdd && (
            <button
              type="button"
              onClick={onAddUnit}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-green-800 hover:text-green-900"
            >
              <Plus className="h-4 w-4" />
              Add unit / shop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
