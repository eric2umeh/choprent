"use server";

import { requireStaffContext } from "@/lib/auth/session";
import {
  buildMetricsSummaryCsv,
  buildMonthlyExportReadme,
  buildPaymentsAuditCsv,
  buildStaffSessionsCsv,
  buildUsageCsv,
  getOrgInsights,
} from "@/lib/data/org-insights";
import { buildTenantActivityCsv } from "@/lib/data/tenant-activity";
import { saveReportSnapshot } from "@/lib/actions/reports";

export type InsightsExportResult = {
  error?: string;
  csv?: string;
  filename?: string;
};

function monthPrefix() {
  return new Date().toISOString().slice(0, 7);
}

async function requireOwnerContext(orgSlug: string) {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    throw new Error("Only the workspace owner can access workspace insights.");
  }
  return ctx;
}

export async function exportPaymentsAudit(orgSlug: string): Promise<InsightsExportResult> {
  try {
    const ctx = await requireOwnerContext(orgSlug);
    const csv = await buildPaymentsAuditCsv(ctx.org.id);
    return { csv, filename: `payments_audit_${monthPrefix()}.csv` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not export payments." };
  }
}

export async function exportTeamSessions(orgSlug: string): Promise<InsightsExportResult> {
  try {
    const ctx = await requireOwnerContext(orgSlug);
    const insights = await getOrgInsights(ctx.org);
    const csv = buildStaffSessionsCsv(insights.staffSessions);
    return { csv, filename: `team_sessions_${monthPrefix()}.csv` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not export team sessions." };
  }
}

export async function exportAppUsage(orgSlug: string): Promise<InsightsExportResult> {
  try {
    const ctx = await requireOwnerContext(orgSlug);
    const insights = await getOrgInsights(ctx.org);
    const csv = buildUsageCsv(insights.usageByMonth);
    return { csv, filename: `app_usage_${monthPrefix()}.csv` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not export app usage." };
  }
}

export async function exportTenantActivity(orgSlug: string): Promise<InsightsExportResult> {
  try {
    const ctx = await requireOwnerContext(orgSlug);
    const insights = await getOrgInsights(ctx.org);
    const csv = await buildTenantActivityCsv(insights.activity);
    return { csv, filename: `tenant_activity_${monthPrefix()}.csv` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not export tenant activity." };
  }
}

export async function exportMetricsSummary(orgSlug: string): Promise<InsightsExportResult> {
  try {
    const ctx = await requireOwnerContext(orgSlug);
    const insights = await getOrgInsights(ctx.org);
    const csv = buildMetricsSummaryCsv(insights);
    return { csv, filename: `metrics_summary_${monthPrefix()}.csv` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not export summary." };
  }
}

export async function exportMonthlyReadme(orgSlug: string): Promise<InsightsExportResult> {
  try {
    const ctx = await requireOwnerContext(orgSlug);
    const insights = await getOrgInsights(ctx.org);
    const csv = buildMonthlyExportReadme(insights);
    return { csv, filename: `monthly_export_${monthPrefix()}.md` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not export readme." };
  }
}

export async function saveInsightsSnapshot(orgSlug: string) {
  return saveReportSnapshot(orgSlug);
}
