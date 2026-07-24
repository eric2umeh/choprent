import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { TenantsSectionTabs } from "@/components/tenants/tenants-section-tabs";
import { FormerTenantsList } from "@/components/tenants/former-tenants-list";
import { requireStaffContext } from "@/lib/auth/session";
import { listLeasesForOrg } from "@/lib/data/leases";

export default async function FormerTenantsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const leases = await listLeasesForOrg(ctx.org.id, { status: "former" });

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Former tenancies — units they left or that were renewed"
      />
      <TenantsSectionTabs orgSlug={orgSlug} />
      <Suspense fallback={<ListLoadingFallback />}>
        <FormerTenantsList orgSlug={orgSlug} leases={leases} />
      </Suspense>
    </div>
  );
}
