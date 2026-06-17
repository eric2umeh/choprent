import { revalidatePath } from "next/cache";
import { propertyPath, unitPath } from "@/lib/routes/dashboard-paths";
import { resolveProperty } from "@/lib/data/sites";

/** Revalidate slug-based property and optional unit dashboard paths. */
export async function revalidatePropertyDashboardPaths(
  orgSlug: string,
  orgId: string,
  siteId: string,
  unitCode?: string
) {
  const property = await resolveProperty(orgId, siteId);
  if (!property) return;

  revalidatePath(propertyPath(orgSlug, property.slug));
  revalidatePath(`/d/${orgSlug}/properties`);
  if (unitCode) {
    revalidatePath(unitPath(orgSlug, property.slug, unitCode));
  }
}
