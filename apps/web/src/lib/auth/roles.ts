import type { MembershipRole } from "@/types/database";

export function canAddUnits(role: MembershipRole | null | undefined): boolean {
  return role === "owner";
}

export function canEditUnits(role: MembershipRole | null | undefined): boolean {
  return role === "owner" || role === "manager";
}

export function canManageLeases(role: MembershipRole | null | undefined): boolean {
  return role === "owner" || role === "manager";
}

export function canManageExpenses(role: MembershipRole | null | undefined): boolean {
  return role === "owner" || role === "manager";
}

export function canVerifyPayments(role: MembershipRole | null | undefined): boolean {
  return role === "owner" || role === "manager" || role === "agent";
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
