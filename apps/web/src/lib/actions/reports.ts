"use server";

import { requireStaffContext } from "@/lib/auth/session";
import { buildPaymentsExport, buildUnitsExport } from "@/lib/data/activity-feed";

export type ExportResult = {
  error?: string;
  csv?: string;
  filename?: string;
};

export async function exportPaymentsCsv(orgSlug: string): Promise<ExportResult> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role === "agent") {
    return { error: "Agents cannot export reports." };
  }

  try {
    const csv = await buildPaymentsExport(ctx.org.id);
    const month = new Date().toISOString().slice(0, 7);
    return { csv, filename: `payments_export_${month}.csv` };
  } catch {
    return { error: "Could not generate payments export." };
  }
}

export async function exportUnitsCsv(orgSlug: string): Promise<ExportResult> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role === "agent") {
    return { error: "Agents cannot export reports." };
  }

  try {
    const csv = await buildUnitsExport(ctx.org.id);
    const month = new Date().toISOString().slice(0, 7);
    return { csv, filename: `units_export_${month}.csv` };
  } catch {
    return { error: "Could not generate units export." };
  }
}
