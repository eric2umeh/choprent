import type { PropertyType, UnitStatus } from "@/types/database";

export type UnitListItem = {
  id: string;
  siteId: string;
  unitCode: string;
  propertyName: string | null;
  propertyType: PropertyType;
  status: UnitStatus;
  tenantName: string | null;
  annualRent: number;
  arrears: number;
  isComposite: boolean;
  compositeNote: string | null;
  virtualAccount: string | null;
};

export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "shop", label: "Shop" },
  { value: "flat", label: "Flat / apartment" },
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "kiosk", label: "Kiosk" },
  { value: "parking", label: "Parking" },
  { value: "restaurant", label: "Restaurant" },
  { value: "other", label: "Other" },
];

export function formatPropertyType(type: PropertyType): string {
  return (
    PROPERTY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
  );
}
