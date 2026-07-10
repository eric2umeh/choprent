import type { Site } from "@/types/database";

export type PropertySummary = {
  id: string;
  slug: string;
  name: string;
  siteType: Site["site_type"];
  addressLine1: string;
  city: string;
  state: string;
  logoPath: string | null;
  logoUrl: string | null;
  unitCount: number;
};

export const SITE_TYPE_OPTIONS: {
  value: Site["site_type"];
  label: string;
}[] = [
  { value: "plaza", label: "Plaza / commercial complex" },
  { value: "mall", label: "Mall" },
  { value: "estate", label: "Estate / housing estate" },
  { value: "compound", label: "Compound / gated community" },
  { value: "house", label: "Standalone house / building" },
];

export function formatSiteType(type: Site["site_type"]): string {
  return SITE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}
