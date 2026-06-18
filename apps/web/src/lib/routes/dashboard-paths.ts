/** Human-readable dashboard URLs (org slug + property slug + unit code). */

import {
  decodeRouteSegment,
  unitCodeFromUrlRef,
  unitCodeToUrlRef,
} from "@/lib/utils/slug";

export function propertyPath(orgSlug: string, propertySlug: string): string {
  return `/d/${orgSlug}/properties/${encodeURIComponent(propertySlug)}`;
}

export function unitPath(
  orgSlug: string,
  propertySlug: string,
  unitCode: string
): string {
  return `/d/${orgSlug}/properties/${encodeURIComponent(propertySlug)}/units/${unitCodeToUrlRef(unitCode)}`;
}

export function tenantPath(orgSlug: string, leaseId: string): string {
  return `/d/${orgSlug}/tenants/${leaseId}`;
}

export { decodeRouteSegment, unitCodeFromUrlRef, unitCodeToUrlRef };
