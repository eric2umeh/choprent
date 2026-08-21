import type { MembershipRole } from "@/types/database";

export function isPrivilegedRole(role: MembershipRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canManageTeam(role: MembershipRole | null | undefined): boolean {
  return isPrivilegedRole(role);
}

export function canAddUnits(role: MembershipRole | null | undefined): boolean {
  return isPrivilegedRole(role);
}

export function canEditUnits(role: MembershipRole | null | undefined): boolean {
  return isPrivilegedRole(role) || role === "manager";
}

export function canManageLeases(role: MembershipRole | null | undefined): boolean {
  return isPrivilegedRole(role) || role === "manager";
}

export function canManageExpenses(role: MembershipRole | null | undefined): boolean {
  return isPrivilegedRole(role) || role === "manager";
}

export function canVerifyPayments(role: MembershipRole | null | undefined): boolean {
  return isPrivilegedRole(role) || role === "manager" || role === "agent";
}

/** Landlords, admins, managers, and agents can organize tenant document folders. */
export function canManageDocumentFolders(
  role: MembershipRole | null | undefined
): boolean {
  return isPrivilegedRole(role) || role === "manager" || role === "agent";
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
