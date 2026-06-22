"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteTeamMember,
  removeTeamMember,
  respondToResignation,
  type ResignationRequest,
  type TeamActionState,
  type TeamMember,
} from "@/lib/actions/team";
import type { PropertySummary } from "@/lib/data/property-types";
import { FormPanel } from "@/components/ui/form-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";

const initial: TeamActionState = {};

export function UsersPageClient({
  orgSlug,
  members,
  properties,
  resignations,
}: {
  orgSlug: string;
  members: TeamMember[];
  properties: PropertySummary[];
  resignations: ResignationRequest[];
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [, startRespond] = useTransition();

  return (
    <div className="space-y-6 px-3 py-4 lg:px-0">
      {resignations.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Pending resignations</h2>
          <ul className="mt-3 space-y-2">
            {resignations.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {r.displayName ?? r.email ?? "Team member"} ·{" "}
                    <span className="capitalize">{r.role}</span>
                  </p>
                  {r.reason && (
                    <p className="text-xs text-muted">Reason: {r.reason}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary px-2 py-1 text-xs"
                    onClick={() => {
                      startRespond(async () => {
                        const result = await respondToResignation(orgSlug, r.id, true);
                        if (result.error) toast.error(result.error);
                        else {
                          toast.success("Resignation accepted — access removed.");
                          router.refresh();
                        }
                      });
                    }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs"
                    onClick={() => {
                      startRespond(async () => {
                        const result = await respondToResignation(orgSlug, r.id, false);
                        if (result.error) toast.error(result.error);
                        else {
                          toast.info("Resignation rejected.");
                          router.refresh();
                        }
                      });
                    }}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-list-meta">
          Invite managers and agents. Assign them to one or more properties.
        </p>
        <button
          type="button"
          className="btn-primary shrink-0 px-3 py-1.5"
          onClick={() => setInviteOpen(true)}
        >
          Add user
        </button>
      </div>

      <UsersList orgSlug={orgSlug} members={members} />

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add team member"
        description="They must sign up at /login first. You'll be warned if they already manage another landlord."
      >
        <InviteUserForm
          orgSlug={orgSlug}
          properties={properties}
          onSaved={() => setInviteOpen(false)}
        />
      </Modal>
    </div>
  );
}

function UsersList({ orgSlug, members }: { orgSlug: string; members: TeamMember[] }) {
  const router = useRouter();
  const [, startRemove] = useTransition();

  async function handleRemove(membershipId: string, email: string | null) {
    const { confirmed } = await confirmDialog({
      title: "Remove team member?",
      message: `Remove ${email ?? "this member"} from your team?`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!confirmed) return;
    startRemove(async () => {
      const result = await removeTeamMember(orgSlug, membershipId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("User removed.");
        router.refresh();
      }
    });
  }

  if (members.length === 0) {
    return <p className="text-list-meta">No team members yet.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-white">
      {members.map((member) => (
        <li key={member.id} className="px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-list-primary">
                {member.displayName ?? member.email ?? member.userId.slice(0, 8)}
              </p>
              {member.displayName && member.email && (
                <p className="text-list-meta">{member.email}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="muted" className="capitalize">
                  {member.role}
                </Badge>
                {member.siteNames.length > 0 ? (
                  member.siteNames.map((name) => (
                    <Badge key={name} variant="muted" className="text-[10px]">
                      {name}
                    </Badge>
                  ))
                ) : member.role === "manager" ? (
                  <Badge variant="muted" className="text-[10px]">
                    All properties
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px]">
                    No sites assigned
                  </Badge>
                )}
              </div>
              {member.otherOrganizations.length > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Also managing: {member.otherOrganizations.join(", ")}
                </p>
              )}
            </div>
            {member.role !== "owner" && (
              <button
                type="button"
                className="text-xs font-semibold text-red-600"
                onClick={() => handleRemove(member.id, member.email)}
              >
                Remove
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function InviteUserForm({
  orgSlug,
  properties,
  onSaved,
}: {
  orgSlug: string;
  properties: PropertySummary[];
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    inviteTeamMember.bind(null, orgSlug),
    initial
  );
  const lastError = useRef<string | undefined>(undefined);
  const lastSuccess = useRef(false);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
      lastError.current = state.error;
    }
    if (state.success && !lastSuccess.current) {
      lastSuccess.current = true;
      if (state.warning) toast.info(state.warning);
      toast.success("Team member added.");
      router.refresh();
      onSaved?.();
    }
  }, [state.error, state.success, state.warning, onSaved, router]);

  return (
    <FormPanel>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="text-label normal-case">Email</label>
          <input
            name="email"
            type="email"
            required
            className="input-field mt-1.5"
            disabled={pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Role</label>
          <select name="role" className="input-field mt-1.5" defaultValue="manager" disabled={pending}>
            <option value="manager">Manager</option>
            <option value="agent">Agent</option>
          </select>
        </div>
        {properties.length > 0 && (
          <div>
            <label className="text-label normal-case">Properties</label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="assign_all_sites" defaultChecked />
              Assign to all properties
            </label>
            <div className="mt-2 space-y-1 rounded-lg border border-border p-2">
              {properties.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="site_ids" value={p.id} />
                  {p.name}
                </label>
              ))}
            </div>
            <p className="mt-1 text-form-hint">
              Uncheck &quot;all properties&quot; to pick specific sites. Agents need at least one.
            </p>
          </div>
        )}
        <LoadingButton type="submit" loading={pending} className="btn-primary w-full">
          Add user
        </LoadingButton>
      </form>
    </FormPanel>
  );
}