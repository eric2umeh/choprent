import type { PropertyType, UnitStatus } from "@/types/database";

export type UnitListItem = {
  id: string;
  unitCode: string;
  propertyType: PropertyType;
  status: UnitStatus;
  tenantName: string | null;
  annualRent: number;
  arrears: number;
  isComposite: boolean;
  compositeNote: string | null;
  virtualAccount: string | null;
};
