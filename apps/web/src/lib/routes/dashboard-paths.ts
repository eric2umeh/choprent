/** Human-readable dashboard URLs (org slug + property slug + unit code). */

export function propertyPath(orgSlug: string, propertySlug: string): string {
  return `/d/${orgSlug}/properties/${propertySlug}`;
}

export function unitPath(
  orgSlug: string,
  propertySlug: string,
  unitCode: string
): string {
  return `/d/${orgSlug}/properties/${propertySlug}/units/${encodeURIComponent(unitCode)}`;
}

export function tenantPath(orgSlug: string, leaseId: string): string {
  return `/d/${orgSlug}/tenants/${leaseId}`;
}

export function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
