import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { TenantPayForm } from "@/components/tenant/tenant-pay-form";
import { requireTenantContext } from "@/lib/auth/session";

export default async function TenantPayPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireTenantContext(orgSlug);

  return (
    <div>
      <PageHeader
        title="Pay rent"
        description="Upload your bank transfer receipt for verification"
      />

      <Card className="rounded-none border-x-0 border-t-0 p-4 shadow-none">
        <TenantPayForm orgSlug={orgSlug} />
      </Card>

      <p className="px-3 py-3 text-center text-[11px] text-muted">
        Or pay directly to the plaza collection account — upload your receipt here
        so management can verify.
      </p>
    </div>
  );
}
