import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid, slugify } from "@/lib/utils/slug";
import type { PropertySummary } from "@/lib/data/property-types";
import type { Site } from "@/types/database";

export type { PropertySummary } from "@/lib/data/property-types";

type SiteRow = Site & { slug?: string };

function mapSite(row: SiteRow, unitCount = 0): PropertySummary {
  const address = (row.address ?? {}) as Record<string, string>;
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name,
    siteType: row.site_type,
    addressLine1: address.line1 ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    logoPath: address.logo_path ?? null,
    unitCount,
  };
}

async function fetchProperties(orgId: string): Promise<PropertySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id, slug, name, site_type, address")
    .eq("organization_id", orgId)
    .order("created_at");

  if (error || !data) {
    try {
      const admin = createAdminClient();
      const { data: adminRows } = await admin
        .from("sites")
        .select("id, slug, name, site_type, address")
        .eq("organization_id", orgId)
        .order("created_at");
      if (!adminRows?.length) return [];
      return attachUnitCounts(adminRows as SiteRow[], admin);
    } catch {
      return [];
    }
  }

  if (!data.length) return [];
  return attachUnitCounts(data as SiteRow[], supabase);
}

async function attachUnitCounts(
  sites: SiteRow[],
  client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>
): Promise<PropertySummary[]> {
  const siteIds = sites.map((s) => s.id);
  const { data: unitRows } = await client
    .from("units")
    .select("site_id")
    .in("site_id", siteIds);

  const counts = new Map<string, number>();
  for (const row of unitRows ?? []) {
    counts.set(row.site_id, (counts.get(row.site_id) ?? 0) + 1);
  }

  return sites.map((site) => mapSite(site, counts.get(site.id) ?? 0));
}

export async function listPropertiesForOrg(orgId: string): Promise<PropertySummary[]> {
  return fetchProperties(orgId);
}

export async function getPrimarySiteForOrg(
  orgId: string
): Promise<PropertySummary | null> {
  const properties = await listPropertiesForOrg(orgId);
  return properties[0] ?? null;
}

/** Resolve a property by URL slug or legacy UUID. */
export async function resolveProperty(
  orgId: string,
  ref: string
): Promise<PropertySummary | null> {
  const properties = await listPropertiesForOrg(orgId);
  if (isUuid(ref)) {
    return properties.find((property) => property.id === ref) ?? null;
  }

  const decoded = decodeURIComponent(ref);
  return (
    properties.find((property) => property.slug === decoded) ??
    properties.find((property) => slugify(property.name) === decoded) ??
    (properties.length === 1 && decoded === properties[0].slug
      ? properties[0]
      : null)
  );
}

/** @deprecated Prefer resolveProperty — kept for internal UUID lookups. */
export async function getPropertyForOrg(
  orgId: string,
  propertyId: string
): Promise<PropertySummary | null> {
  return resolveProperty(orgId, propertyId);
}

export async function getSiteBrandingForUnit(
  unitId: string
): Promise<{ propertyName: string; logoPath: string | null } | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("units")
      .select("sites(name, address)")
      .eq("id", unitId)
      .maybeSingle();
    if (!data?.sites) return null;
    const sites = data.sites as
      | { name: string; address?: Record<string, string> }
      | { name: string; address?: Record<string, string> }[];
    const site = Array.isArray(sites) ? sites[0] : sites;
    if (!site) return null;
    return {
      propertyName: site.name,
      logoPath: site.address?.logo_path ?? null,
    };
  } catch {
    return null;
  }
}
