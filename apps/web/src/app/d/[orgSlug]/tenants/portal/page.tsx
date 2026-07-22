import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { TenantsSectionTabs } from "@/components/tenants/tenants-section-tabs";
import { PortalTenantsList } from "@/components/tenants/portal-tenants-list";
import { requireStaffContext } from "@/lib/auth/session";
import { listPortalTenants } from "@/lib/data/portal-tenants";

export default async function PortalTenantsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const tenants = await listPortalTenants(ctx.org.id);

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Tenants who have signed up and linked their unit in the ChopRent app"
      />
      <TenantsSectionTabs orgSlug={orgSlug} />
      <Suspense fallback={<ListLoadingFallback />}>
        <PortalTenantsList orgSlug={orgSlug} tenants={tenants} />
      </Suspense>
    </div>
  );
}
