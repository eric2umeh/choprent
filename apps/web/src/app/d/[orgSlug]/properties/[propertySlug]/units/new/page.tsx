import { redirect, notFound } from "next/navigation";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { resolveProperty } from "@/lib/data/sites";
import { propertyPath } from "@/lib/routes/dashboard-paths";
import { isUuid } from "@/lib/utils/slug";

/** Add unit is handled via modal on the property page. */
export default async function NewPropertyUnitPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertySlug: string }>;
}) {
  const { orgSlug, propertySlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const property = await resolveProperty(ctx.org.id, propertySlug);
  if (!property) notFound();

  if (!canAddUnits(ctx.role)) {
    redirect(propertyPath(orgSlug, property.slug));
  }

  if (isUuid(propertySlug)) {
    redirect(propertyPath(orgSlug, property.slug));
  }

  redirect(propertyPath(orgSlug, property.slug));
}
