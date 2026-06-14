import { TenantHeader, TenantMobileNav } from "@/components/layout/tenant-nav";
import { requireTenantContext } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { MOCK_ORG } from "@/lib/mock/data";
import { notFound } from "next/navigation";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  if (isDemoMode() && orgSlug !== MOCK_ORG.slug) {
    notFound();
  }

  const ctx = await requireTenantContext(orgSlug);

  return (
    <div className="min-h-screen bg-surface-subtle pb-20">
      <TenantHeader
        orgSlug={orgSlug}
        tenantName={ctx.tenantDisplayName}
        unitCode={ctx.unitCode}
      />
      <main className="mx-auto max-w-lg pb-20">{children}</main>
      <TenantMobileNav orgSlug={orgSlug} />
    </div>
  );
}
