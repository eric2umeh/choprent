import { notFound, redirect } from "next/navigation";
import { PropertyDetailPageClient } from "@/components/properties/property-detail-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits, canManageLeases } from "@/lib/auth/roles";
import { resolveProperty } from "@/lib/data/sites";
import { listUnitsForOrg } from "@/lib/data/units";
import { listExpensesForProperty } from "@/lib/data/expenses";
import { listDocumentsForProperty } from "@/lib/data/documents";
import { isPaystackDvaEnabled } from "@/lib/paystack/client";
import { propertyPath } from "@/lib/routes/dashboard-paths";
import { isUuid } from "@/lib/utils/slug";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertySlug: string }>;
}) {
  const { orgSlug, propertySlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const property = await resolveProperty(ctx.org.id, propertySlug);
  if (!property) notFound();

  if (isUuid(propertySlug)) {
    redirect(propertyPath(orgSlug, property.slug));
  }

  const units = await listUnitsForOrg(ctx.org.id, property.id);
  const [expenses, documents] = await Promise.all([
    listExpensesForProperty(ctx.org.id, property.id),
    listDocumentsForProperty(ctx.org.id, property.id),
  ]);
  const paystackDvaEnabled = isPaystackDvaEnabled();
  const canManageDocs = canManageLeases(ctx.role);

  return (
    <PropertyDetailPageClient
      orgSlug={orgSlug}
      property={property}
      units={units}
      expenses={expenses}
      documents={documents}
      canManage={canAddUnits(ctx.role)}
      canManageDocuments={canManageDocs}
      paystackDvaEnabled={paystackDvaEnabled}
    />
  );
}
