"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  requestResignation,
  type TeamActionState,
} from "@/lib/actions/team";
import {
  updateStaffDisplayName,
  type OrgSettingsActionState,
} from "@/lib/actions/org-settings";
import { FormPanel } from "@/components/ui/form-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

export function StaffDisplayNameForm({
  orgSlug,
  displayName,
  onSaved,
}: {
  orgSlug: string;
  displayName: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateStaffDisplayName.bind(null, orgSlug),
    {} as OrgSettingsActionState
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
      toast.success("Name updated.");
      router.refresh();
      onSaved?.();
    }
  }, [state.error, state.success, onSaved, router]);

  return (
    <FormPanel>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="text-label normal-case">Display name</label>
          <input
            name="display_name"
            required
            defaultValue={displayName}
            className="input-field mt-1.5"
            disabled={pending}
          />
        </div>
        <LoadingButton type="submit" loading={pending} className="btn-primary w-full">
          Save name
        </LoadingButton>
      </form>
    </FormPanel>
  );
}

export function ResignationForm({
  orgSlug,
  onSaved,
}: {
  orgSlug: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    requestResignation.bind(null, orgSlug),
    {} as TeamActionState
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
      toast.success("Resignation request sent to your landlord.");
      router.refresh();
      onSaved?.();
    }
  }, [state.error, state.success, onSaved, router]);

  return (
    <FormPanel>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="text-label normal-case">Reason (optional)</label>
          <textarea
            name="reason"
            rows={3}
            className="input-field mt-1.5"
            placeholder="e.g. relocating, end of contract…"
            disabled={pending}
          />
        </div>
        <LoadingButton type="submit" loading={pending} className="btn-primary w-full">
          Submit request
        </LoadingButton>
      </form>
    </FormPanel>
  );
}
