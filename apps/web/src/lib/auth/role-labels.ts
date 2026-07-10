import type { MembershipRole } from "@/types/database";

export function formatMembershipRole(role: MembershipRole): string {
  switch (role) {
    case "owner":
      return "Landlord";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "agent":
      return "Agent";
    default:
      return role;
  }
}
