import { TenantHeader, TenantMobileNav } from "@/components/layout/tenant-nav";
import { requireTenantContext } from "@/lib/auth/session";
import { displayOrgName, getOrgBranding } from "@/lib/data/org-profile";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireTenantContext(orgSlug);
  const branding = await getOrgBranding(ctx.org.id);

  return (
    <div className="min-h-screen bg-surface-subtle pb-20">
      <TenantHeader
        orgSlug={orgSlug}
        tenantName={ctx.tenantDisplayName}
        unitCode={ctx.unitCode}
        orgDisplayName={branding ? displayOrgName(branding) : ctx.org.name}
      />
      <main className="animate-page-enter mx-auto max-w-lg pb-20">{children}</main>
      <TenantMobileNav orgSlug={orgSlug} />
    </div>
  );
}
