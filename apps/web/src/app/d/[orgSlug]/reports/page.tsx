import { PageHeader } from "@/components/ui/page-header";
import { ReportsPageClient } from "@/components/reports/reports-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { getTenantActivity } from "@/lib/data/tenant-activity";
import { getSavedReportSnapshots } from "@/lib/actions/reports";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const canExport = ctx.role !== "agent";

  const [activity, snapshots] = await Promise.all([
    getTenantActivity(ctx.org.id),
    canExport ? getSavedReportSnapshots(orgSlug) : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Tenant activity, exports, and monthly snapshots"
      />
      <ReportsPageClient
        orgSlug={orgSlug}
        activity={activity}
        snapshots={snapshots}
        canExport={canExport}
      />
    </div>
  );
}
