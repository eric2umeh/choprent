import type { PropertyType, UnitStatus } from "@/types/database";

export type UnitListItem = {
  id: string;
  siteId: string;
  propertySlug: string | null;
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

export type UnitDetail = UnitListItem & {
  leaseId: string | null;
  tenantPhone: string | null;
  tenantEmail: string | null;
  billingCadence: import("@/types/database").BillingCadence;
  billingProfile: {
    baseRentNgn: number;
    servicePct: number;
    agencyFeeNgn: number;
    vatPct: number;
    dieselNgn: number;
    securityNgn: number;
  };
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
