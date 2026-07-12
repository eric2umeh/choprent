import type { MembershipRole } from "@/types/database";

export type RoleDefinition = {
  role: MembershipRole;
  title: string;
  badge: string;
  badgeVariant: "default" | "success" | "warning" | "danger" | "muted";
  summary: string;
  permissions: string[];
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: "owner",
    title: "Landlord",
    badge: "owner",
    badgeVariant: "danger",
    summary:
      "Account owner with full access to the workspace. Signs up at /login and controls billing, team, and all properties.",
    permissions: [
      "Dashboard & analytics",
      "Units & properties",
      "Tenants & leases",
      "Payments & verification",
      "Expenses & reports",
      "Settlement accounts",
      "Users & roles",
      "Invite admins, managers & agents",
      "Reminder rules",
      "Account settings",
    ],
  },
  {
    role: "admin",
    title: "Admin",
    badge: "admin",
    badgeVariant: "default",
    summary:
      "Trusted operator with the same day-to-day access as the landlord. Cannot add, remove, or edit the landlord or other admins.",
    permissions: [
      "Dashboard & analytics",
      "Units & properties",
      "Tenants & leases",
      "Payments & verification",
      "Expenses & reports",
      "Settlement accounts",
      "Users & roles",
      "Invite managers & agents",
      "Reminder rules",
      "Account settings",
    ],
  },
  {
    role: "manager",
    title: "Manager",
    badge: "manager",
    badgeVariant: "success",
    summary:
      "Runs day-to-day plaza operations — tenants, payments, and unit updates. Cannot add properties or manage team access.",
    permissions: [
      "Dashboard",
      "View units & properties",
      "Edit units & billing",
      "Tenants & leases",
      "Verify payments",
      "Expenses",
      "Documents",
      "Settings (own password)",
    ],
  },
  {
    role: "agent",
    title: "Agent",
    badge: "agent",
    badgeVariant: "warning",
    summary:
      "On-site staff who verify tenant payments for assigned properties. Scoped to selected plazas only.",
    permissions: [
      "Dashboard",
      "View assigned properties",
      "Verify payments (assigned sites)",
      "View tenants on assigned sites",
      "Settings (own password)",
    ],
  },
];

export function countMembersByRole(
  members: { role: MembershipRole }[]
): Record<MembershipRole, number> {
  const counts: Record<MembershipRole, number> = {
    owner: 0,
    admin: 0,
    manager: 0,
    agent: 0,
  };
  for (const member of members) {
    counts[member.role] += 1;
  }
  return counts;
}
