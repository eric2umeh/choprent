import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsPageClient } from "@/components/analytics/analytics-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { getPortfolioSummary, getRentAdvisor } from "@/lib/data/analytics";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);

  const [summary, advisor] = await Promise.all([
    getPortfolioSummary(ctx.org.id),
    getRentAdvisor(ctx.org.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Portfolio performance and rent renewal suggestions"
      />
      <AnalyticsPageClient orgSlug={orgSlug} summary={summary} advisor={advisor} />
    </div>
  );
}
