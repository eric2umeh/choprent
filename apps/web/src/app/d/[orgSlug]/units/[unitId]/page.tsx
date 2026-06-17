import { redirect, notFound } from "next/navigation";
import { requireStaffContext } from "@/lib/auth/session";
import { getUnitDetail } from "@/lib/data/units";
import { resolveProperty } from "@/lib/data/sites";
import { unitPath, propertyPath } from "@/lib/routes/dashboard-paths";

/** Legacy `/units/{uuid}` → canonical slug URL. */
export default async function LegacyUnitDetailRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; unitId: string }>;
}) {
  const { orgSlug, unitId } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const unit = await getUnitDetail(unitId, ctx.org.id);
  if (!unit) notFound();

  const property = await resolveProperty(ctx.org.id, unit.siteId);
  if (!property) notFound();

  redirect(unitPath(orgSlug, property.slug, unit.unitCode));
}
