"use server";

import { revalidatePath } from "next/cache";
import { canAddUnits } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import { getPropertyForOrg } from "@/lib/data/sites";
import { parseUnitsImportText, type ParsedImportUnit } from "@/lib/import/units-csv";
import { revalidatePropertyDashboardPaths } from "@/lib/routes/revalidate-dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { regenerateLedgerForUnit } from "@/lib/charges/generate-ledger";

export type UnitImportActionState = {
  error?: string;
  success?: boolean;
  created?: number;
  skipped?: number;
  preview?: ParsedImportUnit[];
};

function isCompositeCode(code: string): boolean {
  return /[/&]/.test(code);
}

function currentYearRange() {
  const year = new Date().getFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export async function previewUnitsImport(
  orgSlug: string,
  csvText: string
): Promise<UnitImportActionState> {
  await requireStaffContext(orgSlug);
  const preview = parseUnitsImportText(csvText);
  if (!preview.length) {
    return { error: "No units found. Use CSV or paste from your plaza spreadsheet." };
  }
  return { preview };
}

export async function importUnitsFromCsv(
  orgSlug: string,
  _prev: UnitImportActionState,
  formData: FormData
): Promise<UnitImportActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canAddUnits(ctx.role)) {
    return { error: "Only the landlord or an admin can import units." };
  }

  const siteId = String(formData.get("site_id") ?? "").trim();
  const csvText = String(formData.get("csv_text") ?? "").trim();
  const createLeases = formData.get("create_leases") === "on";

  if (!siteId) return { error: "Choose a property first." };
  if (!csvText) return { error: "Paste CSV rows or spreadsheet data." };

  const property = await getPropertyForOrg(ctx.org.id, siteId);
  if (!property) return { error: "Property not found." };

  const rows = parseUnitsImportText(csvText);
  if (!rows.length) {
    return { error: "No units found in the pasted data." };
  }

  const admin = createAdminClient();
  const { data: existingRows } = await admin
    .from("units")
    .select("unit_code")
    .eq("site_id", siteId);

  const existing = new Set((existingRows ?? []).map((row) => row.unit_code));
  const { start, end } = currentYearRange();

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    if (existing.has(row.unitCode)) {
      skipped += 1;
      continue;
    }

    const { data: unit, error: unitError } = await admin
      .from("units")
      .insert({
        organization_id: ctx.org.id,
        site_id: siteId,
        unit_code: row.unitCode,
        unit_code_normalized: row.unitCode.toLowerCase().replace(/\s+/g, ""),
        is_composite: isCompositeCode(row.unitCode),
        composite_note: isCompositeCode(row.unitCode)
          ? `Combined units: ${row.unitCode}`
          : null,
        property_type: "shop",
        status: row.status,
      })
      .select("id")
      .single();

    if (unitError || !unit) {
      skipped += 1;
      continue;
    }

    existing.add(row.unitCode);
    created += 1;

    if (row.annualRent && row.annualRent > 0) {
      await admin.from("unit_billing_profiles").insert({
        unit_id: unit.id,
        base_rent_ngn: row.annualRent,
        service_pct: 0,
        agency_fee_ngn: 0,
        vat_pct: 0,
      });
    }

    if (createLeases && row.tenantName) {
      const { data: lease } = await admin
        .from("leases")
        .insert({
          unit_id: unit.id,
          tenant_display_name: row.tenantName,
          start_date: start,
          end_date: end,
          billing_cadence: "annual",
          status: "active",
        })
        .select("id")
        .single();

      if (lease?.id && row.annualRent && row.annualRent > 0) {
        await regenerateLedgerForUnit(admin, ctx.org.id, unit.id);
      }
    }
  }

  revalidatePropertyDashboardPaths(orgSlug, ctx.org.id, siteId);
  revalidatePath(`/d/${orgSlug}/properties`);
  revalidatePath(`/d/${orgSlug}/tenants`);

  return {
    success: true,
    created,
    skipped,
  };
}
