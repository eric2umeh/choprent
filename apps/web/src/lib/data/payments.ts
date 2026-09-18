import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentMethod, PaymentStatus } from "@/types/database";
import type { TenantPaymentStatus } from "@/lib/data/tenant-payment-status";
import { paymentNoteFromRow } from "@/lib/payments/payment-note";
import { actorLabel, resolveActorLabels } from "@/lib/data/audit-actors";

export type PaymentListItem = {
  id: string;
  unitId: string;
  unitCode: string;
  tenantName: string;
  leaseId: string | null;
  rentStatus: TenantPaymentStatus | null;
  amount: number;
  periodLabel: string | null;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  bankReference: string | null;
  receiptFileUrl: string | null;
  paymentDate: string | null;
  paymentNote: string | null;
  createdAt: string;
  submittedByName: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
};

type PaymentRow = {
  id: string;
  unit_id: string;
  amount_ngn: number;
  period_label: string | null;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  bank_reference: string | null;
  receipt_file_url: string | null;
  payment_date: string | null;
  payment_note?: string | null;
  metadata?: unknown;
  created_at: string;
  recorded_by?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  tenant_id?: string | null;
  units: { unit_code: string } | { unit_code: string }[] | null;
  leases?: never;
};

function unitCodeFromRow(units: PaymentRow["units"]): string {
  if (!units) return "—";
  if (Array.isArray(units)) return units[0]?.unit_code ?? "—";
  return units.unit_code;
}

type LeaseInfo = {
  name: string;
  leaseId: string | null;
  rentStatus: TenantPaymentStatus | null;
};

/** One query for all active lease names — avoids N+1 per payment row. */
async function leaseInfoByUnitIds(
  orgId: string,
  unitIds: string[],
  statusByUnit: Map<string, { status: TenantPaymentStatus; leaseId: string }>
): Promise<Map<string, LeaseInfo>> {
  const map = new Map<string, LeaseInfo>();
  const unique = [...new Set(unitIds)];
  if (!unique.length) return map;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("leases")
      .select("id, unit_id, tenant_display_name, units!inner(organization_id)")
      .eq("units.organization_id", orgId)
      .in("unit_id", unique)
      .eq("status", "active");

    for (const row of data ?? []) {
      const status = statusByUnit.get(row.unit_id);
      map.set(row.unit_id, {
        name: row.tenant_display_name ?? "—",
        leaseId: row.id,
        rentStatus: status?.status ?? null,
      });
    }
  } catch {
    // fall through with empty map
  }

  for (const unitId of unique) {
    if (map.has(unitId)) continue;
    const status = statusByUnit.get(unitId);
    map.set(unitId, {
      name: "—",
      leaseId: status?.leaseId ?? null,
      rentStatus: status?.status ?? null,
    });
  }

  return map;
}

function mapPaymentRow(
  row: PaymentRow,
  tenant: LeaseInfo,
  actors: Map<string, string>
): PaymentListItem {
  return {
    id: row.id,
    unitId: row.unit_id,
    unitCode: unitCodeFromRow(row.units),
    tenantName: tenant.name,
    leaseId: tenant.leaseId,
    rentStatus: tenant.rentStatus,
    amount: Number(row.amount_ngn),
    periodLabel: row.period_label,
    paymentMethod: row.payment_method,
    status: row.status,
    bankReference: row.bank_reference,
    receiptFileUrl: row.receipt_file_url,
    paymentDate: row.payment_date,
    paymentNote: paymentNoteFromRow(row),
    createdAt: row.created_at,
    submittedByName: actorLabel(
      actors,
      row.recorded_by ?? row.tenant_id ?? row.verified_by
    ),
    verifiedByName: actorLabel(actors, row.verified_by),
    verifiedAt: row.verified_at ? String(row.verified_at).slice(0, 10) : null,
  };
}

const paymentSelect =
  "id, unit_id, amount_ngn, period_label, payment_method, status, bank_reference, receipt_file_url, payment_date, payment_note, metadata, created_at, recorded_by, verified_by, verified_at, tenant_id, units!inner(unit_code)";

async function mapPaymentRows(
  orgId: string,
  rows: PaymentRow[],
  statusByUnit: Map<string, { status: TenantPaymentStatus; leaseId: string }>
): Promise<PaymentListItem[]> {
  const [actors, leaseByUnit] = await Promise.all([
    resolveActorLabels(
      orgId,
      rows.flatMap((r) => [r.recorded_by, r.tenant_id, r.verified_by])
    ),
    leaseInfoByUnitIds(
      orgId,
      rows.map((r) => r.unit_id),
      statusByUnit
    ),
  ]);

  return rows.map((row) => {
    const tenant = leaseByUnit.get(row.unit_id) ?? {
      name: "—",
      leaseId: null,
      rentStatus: null,
    };
    return mapPaymentRow(row, tenant, actors);
  });
}

/** Status map for rent badges on the payments list. */
async function lightStatusByUnit(
  orgId: string
): Promise<Map<string, { status: TenantPaymentStatus; leaseId: string }>> {
  try {
    const { getTenantStatusByUnit } = await import("@/lib/data/leases");
    return getTenantStatusByUnit(orgId);
  } catch {
    return new Map();
  }
}

export async function listPaymentsForOrg(
  orgId: string
): Promise<PaymentListItem[]> {
  const statusByUnit = await lightStatusByUnit(orgId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(paymentSelect)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    try {
      const admin = createAdminClient();
      const { data: adminRows } = await admin
        .from("payments")
        .select(paymentSelect)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (!adminRows) return [];
      return mapPaymentRows(orgId, adminRows as PaymentRow[], statusByUnit);
    } catch {
      return [];
    }
  }

  return mapPaymentRows(orgId, data as PaymentRow[], statusByUnit);
}
