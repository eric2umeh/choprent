import { TenantHeader, TenantMobileNav } from "@/components/layout/tenant-nav";
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
  if (orgSlug !== MOCK_ORG.slug) notFound();

  return (
    <div className="min-h-screen bg-surface-subtle pb-20">
      <TenantHeader
        orgSlug={orgSlug}
        tenantName="Chidi Traders Ltd"
        unitCode="14"
      />
      <main className="mx-auto max-w-lg pb-20">{children}</main>
      <TenantMobileNav orgSlug={orgSlug} />
    </div>
  );
}
