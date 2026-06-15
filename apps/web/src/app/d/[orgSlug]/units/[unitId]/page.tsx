import { redirect } from "next/navigation";

export default async function LegacyUnitDetailRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; unitId: string }>;
}) {
  const { orgSlug, unitId } = await params;
  const { requireStaffContext } = await import("@/lib/auth/session");
  const { getUnitDetail } = await import("@/lib/data/units");
  const ctx = await requireStaffContext(orgSlug);
  const unit = await getUnitDetail(unitId, ctx.org.id);
  if (unit) {
    redirect(`/d/${orgSlug}/properties/${unit.siteId}/units/${unitId}`);
  }
  redirect(`/d/${orgSlug}/properties`);
}
