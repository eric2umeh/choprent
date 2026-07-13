"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext, requireTenantContext } from "@/lib/auth/session";
import {
  buildTenantActivityCsv,
  getTenantActivity,
  listReportSnapshots,
  tenantActivityToJson,
  type TenantEngagementEventType,
} from "@/lib/data/tenant-activity";
import { buildPaymentsExport, buildUnitsExport } from "@/lib/data/activity-feed";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordTenantEngagementInternal } from "@/lib/actions/tenant-activity-internal";

export type ExportResult = {
  error?: string;
  csv?: string;
  filename?: string;
};

export type ReportsActionState = {
  error?: string;
  success?: boolean;
};

export type ReportsPackResult = ExportResult & {
  json?: string;
};

export async function exportPaymentsCsv(
  orgSlug: string,
  startDate?: string,
  endDate?: string
): Promise<ExportResult> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role === "agent") {
    return { error: "Agents cannot export reports." };
  }

  try {
    const csv = await buildPaymentsExport(ctx.org.id, startDate, endDate);
    const range =
      startDate && endDate
        ? `${startDate}_to_${endDate}`
        : new Date().toISOString().slice(0, 7);
    return { csv, filename: `payments_export_${range}.csv` };
  } catch {
    return { error: "Could not generate payments export." };
  }
}

export async function exportUnitsCsv(
  orgSlug: string,
  startDate?: string,
  endDate?: string
): Promise<ExportResult> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role === "agent") {
    return { error: "Agents cannot export reports." };
  }

  try {
    const csv = await buildUnitsExport(ctx.org.id, startDate, endDate);
    const range =
      startDate && endDate
        ? `${startDate}_to_${endDate}`
        : new Date().toISOString().slice(0, 7);
    return { csv, filename: `units_export_${range}.csv` };
  } catch {
    return { error: "Could not generate units export." };
  }
}

export async function recordTenantEngagement(
  orgSlug: string,
  eventType: TenantEngagementEventType,
  metadata: Record<string, string> = {}
): Promise<ReportsActionState> {
  try {
    const ctx = await requireTenantContext(orgSlug);

    await recordTenantEngagementInternal({
      orgId: ctx.org.id,
      tenantUserId: ctx.user.id,
      leaseId: ctx.leaseId,
      unitId: ctx.unitId,
      eventType,
      metadata,
    });

    return { success: true };
  } catch {
    return { error: "Could not record engagement." };
  }
}

/** Staff-side logging when verifying DVA or similar (optional). */
export async function recordTenantEngagementForLease(
  orgSlug: string,
  leaseId: string,
  eventType: TenantEngagementEventType
): Promise<ReportsActionState> {
  const ctx = await requireStaffContext(orgSlug);
  const admin = createAdminClient();

  const { data: lease } = await admin
    .from("leases")
    .select("tenant_user_id, unit_id, units!inner(organization_id)")
    .eq("id", leaseId)
    .eq("units.organization_id", ctx.org.id)
    .maybeSingle();

  if (!lease?.tenant_user_id) {
    return { error: "Tenant login not linked to this lease." };
  }

  const { error } = await admin.from("tenant_engagement_events").insert({
    organization_id: ctx.org.id,
    tenant_user_id: lease.tenant_user_id,
    lease_id: leaseId,
    unit_id: lease.unit_id,
    event_type: eventType,
    metadata: { recorded_by: ctx.user.id },
  });

  if (error) return { error: error.message };
  revalidatePath(`/d/${orgSlug}/reports`);
  return { success: true };
}

export async function saveReportSnapshot(orgSlug: string): Promise<ReportsActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role === "agent") {
    return { error: "Agents cannot save report snapshots." };
  }

  const activity = await getTenantActivity(ctx.org.id);
  const today = new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();

  const { error } = await admin.from("metrics_snapshots").upsert(
    {
      organization_id: ctx.org.id,
      snapshot_date: today,
      units_registered: activity.unitsRegistered,
      tenants_with_profiles: activity.tenantsWithProfiles,
      tenants_self_served: activity.tenantsSelfServing,
      verified_payments_count: activity.verifiedPaymentsThisMonth,
      verified_total_ngn: activity.verifiedTotalNgnThisMonth,
      collection_rate_pct: activity.collectionRatePct,
      arrears_ngn: activity.arrearsNgn,
    },
    { onConflict: "organization_id,snapshot_date" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/reports`);
  return { success: true };
}

export async function exportTenantActivityPack(orgSlug: string): Promise<ReportsPackResult> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role === "agent") {
    return { error: "Agents cannot export reports." };
  }

  try {
    const activity = await getTenantActivity(ctx.org.id);
    const month = new Date().toISOString().slice(0, 7);
    return {
      csv: await buildTenantActivityCsv(activity),
      json: tenantActivityToJson(activity),
      filename: `tenant_activity_${month}`,
    };
  } catch {
    return { error: "Could not build report export." };
  }
}

export async function getSavedReportSnapshots(orgSlug: string) {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role === "agent") return [];
  return listReportSnapshots(ctx.org.id);
}
