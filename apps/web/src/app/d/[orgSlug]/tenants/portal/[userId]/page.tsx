import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TenantsSectionTabs } from "@/components/tenants/tenants-section-tabs";
import { PortalTenantDetailClient } from "@/components/tenants/portal-tenant-detail-client";
import { requireStaffContext } from "@/lib/auth/session";
import { getPortalTenantDetail } from "@/lib/data/portal-tenants";

export default async function PortalTenantDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; userId: string }>;
}) {
  const { orgSlug, userId } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const tenant = await getPortalTenantDetail(ctx.org.id, userId);
  if (!tenant) notFound();

  return (
    <div>
      <PageHeader
        title={tenant.tenantName}
        description={`App account · Unit ${tenant.unitCode} · ${tenant.propertyName}`}
        action={
          <Link
            href={`/d/${orgSlug}/tenants/portal`}
            className="btn-ghost px-3 py-1.5"
          >
            ← App accounts
          </Link>
        }
      />
      <TenantsSectionTabs orgSlug={orgSlug} />
      <PortalTenantDetailClient orgSlug={orgSlug} tenant={tenant} />
    </div>
  );
}
