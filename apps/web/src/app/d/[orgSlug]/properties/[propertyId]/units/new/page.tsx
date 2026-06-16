import { redirect } from "next/navigation";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { getPropertyForOrg } from "@/lib/data/sites";
import { notFound } from "next/navigation";

/** Add unit is handled via modal on the property page. */
export default async function NewPropertyUnitPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertyId: string }>;
}) {
  const { orgSlug, propertyId } = await params;
  const ctx = await requireStaffContext(orgSlug);

  if (!canAddUnits(ctx.role)) {
    redirect(`/d/${orgSlug}/properties/${propertyId}`);
  }

  const property = await getPropertyForOrg(ctx.org.id, propertyId);
  if (!property) notFound();

  redirect(`/d/${orgSlug}/properties/${propertyId}`);
}
