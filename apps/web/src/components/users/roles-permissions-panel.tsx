"use client";

import { Badge } from "@/components/ui/badge";
import {
  ROLE_DEFINITIONS,
  countMembersByRole,
  type RoleDefinition,
} from "@/lib/auth/role-permissions";
import type { TeamMember } from "@/lib/actions/team";

function RoleCard({
  definition,
  staffCount,
}: {
  definition: RoleDefinition;
  staffCount: number;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{definition.title}</h3>
        <Badge variant={definition.badgeVariant} className="shrink-0 uppercase">
          {definition.badge}
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{definition.summary}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{definition.permissions.length} areas</span>
        <span>
          {staffCount} {staffCount === 1 ? "person" : "people"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {definition.permissions.map((permission) => (
          <span
            key={permission}
            className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
          >
            {permission}
          </span>
        ))}
      </div>
    </article>
  );
}

export function RolesPermissionsPanel({ members }: { members: TeamMember[] }) {
  const counts = countMembersByRole(members);

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-border bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-muted">
        Role permissions are fixed in the app. Only the <strong>landlord</strong> can
        invite or remove <strong>admins</strong>. Admins can manage managers and agents
        but cannot change the landlord account.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ROLE_DEFINITIONS.map((definition) => (
          <RoleCard
            key={definition.role}
            definition={definition}
            staffCount={counts[definition.role]}
          />
        ))}
      </div>
    </div>
  );
}
