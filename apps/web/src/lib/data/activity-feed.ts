import { listPaymentsForOrg } from "@/lib/data/payments";
import { listUnitsForOrg } from "@/lib/data/units";
import { buildCsv } from "@/lib/export/csv";

export type ActivityItem = {
  id: string;
  kind: "pending" | "verified" | "rejected" | "cash";
  title: string;
  detail: string;
  amount: number;
  at: string;
};

function methodLabel(method: string): string {
  const map: Record<string, string> = {
    bank_transfer: "Transfer",
    cheque: "Cheque",
    cash: "Cash",
    cash_recorded: "Cash",
    dedicated_account: "DVA",
  };
  return map[method] ?? method;
}

export async function getActivityFeed(orgId: string, limit = 10): Promise<ActivityItem[]> {
  const payments = await listPaymentsForOrg(orgId);

  return payments.slice(0, limit).map((p) => {
    let kind: ActivityItem["kind"] = "verified";
    let title = `${p.unitCode} · ${methodLabel(p.paymentMethod)}`;

    if (p.status === "pending") {
      kind = "pending";
      title = `${p.unitCode} ${methodLabel(p.paymentMethod).toLowerCase()} awaiting verification`;
    } else if (p.status === "rejected") {
      kind = "rejected";
      title = `${p.unitCode} payment rejected`;
    } else if (p.paymentMethod === "cash_recorded") {
      kind = "cash";
      title = `Cash recorded · ${p.unitCode}`;
    } else if (p.status === "verified" || p.status === "auto_matched") {
      kind = "verified";
      title = `${p.unitCode} ${methodLabel(p.paymentMethod).toLowerCase()} verified`;
    }

    return {
      id: p.id,
      kind,
      title,
      detail: p.tenantName,
      amount: p.amount,
      at: p.createdAt,
    };
  });
}

export function paymentsToCsv(
  payments: Awaited<ReturnType<typeof listPaymentsForOrg>>
): string {
  return buildCsv(
    [
      "payment_id",
      "unit_code",
      "tenant_name",
      "amount_ngn",
      "period_label",
      "payment_method",
      "status",
      "bank_reference",
      "has_receipt",
      "created_at",
    ],
    payments.map((p) => [
      p.id,
      p.unitCode,
      p.tenantName,
      p.amount,
      p.periodLabel,
      p.paymentMethod,
      p.status,
      p.bankReference,
      p.receiptFileUrl ? "yes" : "no",
      p.createdAt,
    ])
  );
}

export function unitsToCsv(units: Awaited<ReturnType<typeof listUnitsForOrg>>): string {
  return buildCsv(
    [
      "unit_id",
      "unit_code",
      "property_name",
      "property_type",
      "status",
      "tenant_name",
      "arrears_ngn",
      "shop_account",
    ],
    units.map((u) => [
      u.id,
      u.unitCode,
      u.propertyName,
      u.propertyType,
      u.status,
      u.tenantName,
      u.arrears,
      u.virtualAccount,
    ])
  );
}

export async function buildPaymentsExport(
  orgId: string,
  startDate?: string,
  endDate?: string
): Promise<string> {
  const payments = await listPaymentsForOrg(orgId);
  const filtered = payments.filter((p) => {
    if (!startDate && !endDate) return true;
    const day = p.createdAt.slice(0, 10);
    if (startDate && day < startDate) return false;
    if (endDate && day > endDate) return false;
    return true;
  });
  return paymentsToCsv(filtered);
}

export async function buildUnitsExport(
  orgId: string,
  startDate?: string,
  endDate?: string
): Promise<string> {
  const units = await listUnitsForOrg(orgId);
  const filtered = units.filter((u) => {
    if (!startDate && !endDate) return true;
    if (!u.createdAt) return true;
    if (startDate && u.createdAt < startDate) return false;
    if (endDate && u.createdAt > endDate) return false;
    return true;
  });
  return unitsToCsv(filtered);
}
