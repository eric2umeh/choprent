import { TenantHeader, TenantMobileNav } from "@/components/layout/tenant-nav";
import { AddToHomeScreenPrompt } from "@/components/pwa/add-to-home-screen";
import { AppUsageRecorder } from "@/components/pwa/app-usage-recorder";
import { PreventAuthHistoryBack } from "@/components/auth/prevent-auth-history-back";
import { requireTenantContext } from "@/lib/auth/session";
import { displayOrgName, getOrgBranding } from "@/lib/data/org-profile";
import { getSiteBrandingForUnit } from "@/lib/data/sites";
import { createSignedStorageUrl } from "@/lib/storage/signed-url";
import { redirect } from "next/navigation";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireTenantContext(orgSlug);

  // Keep URL on the property slug (e.g. /t/befs-plaza), not the workspace email slug.
  if (ctx.portalSlug && ctx.portalSlug !== orgSlug) {
    redirect(`/t/${ctx.portalSlug}`);
  }

  const portalSlug = ctx.portalSlug || orgSlug;
  const branding = await getOrgBranding(ctx.org.id);
  const siteBranding = await getSiteBrandingForUnit(ctx.unitId);
  const propertyLogoUrl = siteBranding?.logoPath
    ? await createSignedStorageUrl("documents", siteBranding.logoPath)
    : null;

  return (
    <div className="min-h-screen bg-surface-subtle pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <PreventAuthHistoryBack />
      <TenantHeader
        orgSlug={portalSlug}
        tenantName={ctx.tenantDisplayName}
        unitCode={ctx.unitCode}
        orgDisplayName={branding ? displayOrgName(branding) : ctx.org.name}
        propertyLogoUrl={propertyLogoUrl}
        propertyName={siteBranding?.propertyName ?? ctx.propertyName}
      />
      <main className="animate-page-enter mx-auto max-w-lg pb-4">{children}</main>
      <TenantMobileNav orgSlug={portalSlug} />
      <AppUsageRecorder orgSlug={portalSlug} userId={ctx.user.id} audience="tenant" />
      <AddToHomeScreenPrompt orgSlug={portalSlug} userId={ctx.user.id} audience="tenant" />
    </div>
  );
}
