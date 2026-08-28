import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { InsightsPageClient } from "@/components/insights/insights-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { getOrgInsights } from "@/lib/data/org-insights";
import { getSavedReportSnapshots } from "@/lib/actions/reports";

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);

  if (ctx.role !== "owner") {
    redirect(`/d/${orgSlug}/reports`);
  }

  try {
    const [insights, snapshots] = await Promise.all([
      getOrgInsights(ctx.org),
      getSavedReportSnapshots(orgSlug),
    ]);

    return (
      <div>
        <PageHeader
          title="Insights"
          description="Workspace metrics, exports, and monthly snapshots"
        />
        <InsightsPageClient orgSlug={orgSlug} insights={insights} snapshots={snapshots} />
      </div>
    );
  } catch {
    notFound();
  }
}
