import { createClient } from "@/lib/supabase/server";
import { MOCK_ORG } from "@/lib/mock/data";
import type { PropertySummary } from "@/lib/data/property-types";
import type { Site } from "@/types/database";

export type { PropertySummary } from "@/lib/data/property-types";

function mapSite(row: Site): PropertySummary {
  const address = (row.address ?? {}) as Record<string, string>;
  return {
    id: row.id,
    name: row.name,
    siteType: row.site_type,
    addressLine1: address.line1 ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
  };
}

export async function listPropertiesForOrg(
  orgId: string,
  demoMode: boolean
): Promise<PropertySummary[]> {
  if (demoMode) {
    return MOCK_ORG.sites.map((site) => ({
      id: site.id,
      name: site.name,
      siteType: site.siteType,
      addressLine1: site.address.split(",")[0]?.trim() ?? site.address,
      city: site.city,
      state: site.state,
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("id, name, site_type, address")
    .eq("organization_id", orgId)
    .order("created_at");

  return (data ?? []).map((row) => mapSite(row as Site));
}

/** Returns the first property when callers only need a default. */
export async function getPrimarySiteForOrg(
  orgId: string,
  demoMode: boolean
): Promise<PropertySummary | null> {
  const properties = await listPropertiesForOrg(orgId, demoMode);
  return properties[0] ?? null;
}

export async function getPropertyForOrg(
  orgId: string,
  propertyId: string,
  demoMode: boolean
): Promise<PropertySummary | null> {
  const properties = await listPropertiesForOrg(orgId, demoMode);
  return properties.find((property) => property.id === propertyId) ?? null;
}
