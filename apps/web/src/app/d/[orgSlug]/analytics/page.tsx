import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsPageClient } from "@/components/analytics/analytics-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { getPortfolioMetrics, getRentAdvisor } from "@/lib/data/analytics";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);

  const [metrics, advisor] = await Promise.all([
    getPortfolioMetrics(ctx.org.id),
    getRentAdvisor(ctx.org.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Collection trends, margins, and rent renewal guidance"
      />
      <AnalyticsPageClient orgSlug={orgSlug} metrics={metrics} advisor={advisor} />
    </div>
  );
}
