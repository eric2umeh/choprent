import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentMethod, PaymentStatus } from "@/types/database";
import type { TenantPaymentStatus } from "@/lib/data/tenant-payment-status";

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
  createdAt: string;
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
  created_at: string;
  units: { unit_code: string } | { unit_code: string }[] | null;
  leases?: never;
};

function unitCodeFromRow(units: PaymentRow["units"]): string {
  if (!units) return "—";
  if (Array.isArray(units)) return units[0]?.unit_code ?? "—";
  return units.unit_code;
}

async function tenantInfoForUnit(
  unitId: string,
  statusByUnit: Map<string, { status: TenantPaymentStatus; leaseId: string }>
): Promise<{ name: string; leaseId: string | null; rentStatus: TenantPaymentStatus | null }> {
  const fromMap = statusByUnit.get(unitId);
  if (fromMap) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("leases")
      .select("tenant_display_name")
      .eq("id", fromMap.leaseId)
      .maybeSingle();
    return {
      name: data?.tenant_display_name ?? "—",
      leaseId: fromMap.leaseId,
      rentStatus: fromMap.status,
    };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("leases")
    .select("id, tenant_display_name")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return {
    name: data?.tenant_display_name ?? "—",
    leaseId: data?.id ?? null,
    rentStatus: null,
  };
}

function mapPaymentRow(
  row: PaymentRow,
  tenant: { name: string; leaseId: string | null; rentStatus: TenantPaymentStatus | null }
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
    createdAt: row.created_at,
  };
}

export async function listPaymentsForOrg(
  orgId: string
): Promise<PaymentListItem[]> {
  const { getTenantStatusByUnit } = await import("@/lib/data/leases");
  const statusByUnit = await getTenantStatusByUnit(orgId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, unit_id, amount_ngn, period_label, payment_method, status, bank_reference, receipt_file_url, created_at, units!inner(unit_code)"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    try {
      const admin = createAdminClient();
      const { data: adminRows } = await admin
        .from("payments")
        .select(
          "id, unit_id, amount_ngn, period_label, payment_method, status, bank_reference, receipt_file_url, created_at, units!inner(unit_code)"
        )
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (!adminRows) return [];
      return Promise.all(
        adminRows.map(async (row) => {
          const r = row as PaymentRow;
          const tenant = await tenantInfoForUnit(r.unit_id, statusByUnit);
          return mapPaymentRow(r, tenant);
        })
      );
    } catch {
      return [];
    }
  }

  return Promise.all(
    (data as PaymentRow[]).map(async (row) => {
      const tenant = await tenantInfoForUnit(row.unit_id, statusByUnit);
      return mapPaymentRow(row, tenant);
    })
  );
}
