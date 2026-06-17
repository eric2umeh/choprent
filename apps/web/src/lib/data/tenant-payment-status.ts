export type TenantPaymentStatus = "paid" | "partial" | "debt";

export function deriveTenantPaymentStatus(
  expected: number,
  paid: number,
  arrears: number
): TenantPaymentStatus {
  if (expected <= 0 && arrears <= 0) return "paid";
  if (expected > 0 && paid >= expected && arrears <= 0) return "paid";
  if (paid > 0 && (paid < expected || arrears > 0)) return "partial";
  return "debt";
}

export function tenantPaymentStatusLabel(status: TenantPaymentStatus): string {
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partial";
  return "In debt";
}

export function tenantPaymentStatusBadgeVariant(
  status: TenantPaymentStatus
): "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "partial") return "warning";
  return "danger";
}
