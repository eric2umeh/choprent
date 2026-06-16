"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteTeamMember,
  removeTeamMember,
  type TeamActionState,
  type TeamMember,
} from "@/lib/actions/team";
import { FormPanel } from "@/components/ui/form-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";

const initial: TeamActionState = {};

export function TeamMembersList({
  orgSlug,
  members,
}: {
  orgSlug: string;
  members: TeamMember[];
}) {
  const router = useRouter();
  const [, startRemove] = useTransition();

  async function handleRemove(membershipId: string, email: string | null) {
    const { confirmed } = await confirmDialog({
      title: "Remove team member?",
      message: `Remove ${email ?? "this member"} from your team? They will lose access immediately.`,
      confirmLabel: "Remove member",
      destructive: true,
    });
    if (!confirmed) return;
    startRemove(async () => {
      const result = await removeTeamMember(orgSlug, membershipId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Team member removed.");
        router.refresh();
      }
    });
  }

  if (members.length === 0) {
    return <p className="text-list-meta">No team members yet — invite a manager or agent.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex items-center justify-between gap-3 px-3 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-list-primary">
              {member.email ?? member.userId.slice(0, 8)}
            </p>
            <Badge variant="muted" className="mt-1 capitalize">
              {member.role}
            </Badge>
          </div>
          {member.role !== "owner" && (
            <button
              type="button"
              className="text-xs font-semibold text-red-600 hover:text-red-700"
              onClick={() => handleRemove(member.id, member.email)}
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TeamInviteForm({
  orgSlug,
  onSaved,
}: {
  orgSlug: string;
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
      toast.success("Team member added.");
      router.refresh();
      onSaved?.();
    }
  }, [state.error, state.success, onSaved, router]);

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
            placeholder="manager@example.com"
            disabled={pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Role</label>
          <select
            name="role"
            className="input-field mt-1.5"
            defaultValue="manager"
            disabled={pending}
          >
            <option value="manager">Manager — tenants, verify payments</option>
            <option value="agent">Agent — verify payments on assigned sites</option>
          </select>
        </div>
        <LoadingButton
          type="submit"
          loading={pending}
          className="btn-primary w-full py-2.5 sm:w-auto sm:px-6"
        >
          Send invite
        </LoadingButton>
      </form>
    </FormPanel>
  );
}

/** @deprecated Use SettingsPageClient instead */
export function TeamPanel({
  orgSlug,
  members,
}: {
  orgSlug: string;
  members: TeamMember[];
}) {
  return (
    <div className="space-y-6 border-t border-border pt-6">
      <TeamMembersList orgSlug={orgSlug} members={members} />
      <TeamInviteForm orgSlug={orgSlug} />
    </div>
  );
}
