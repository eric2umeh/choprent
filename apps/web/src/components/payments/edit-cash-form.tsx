"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateCashPayment, type PaymentActionState } from "@/lib/actions/payments";
import type { PaymentListItem } from "@/lib/data/payments";
import { LoadingButton } from "@/components/ui/loading-button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

const initial: PaymentActionState = {};

export function EditCashForm({
  orgSlug,
  payment,
  open,
  onClose,
}: {
  orgSlug: string;
  payment: PaymentListItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateCashPayment.bind(null, orgSlug),
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
      toast.success("Payment updated.");
      router.refresh();
      onClose();
    }
  }, [state.error, state.success, onClose, router]);

  useEffect(() => {
    if (!open) {
      lastSuccess.current = false;
      lastError.current = undefined;
    }
  }, [open]);

  if (!payment) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit payment — Unit ${payment.unitCode}`}
      description="Fix amount, period, or date for this cash payment."
      preventClose={pending}
    >
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="payment_id" value={payment.id} />
        <div>
          <label className="text-label normal-case">Amount (₦)</label>
          <input
            name="amount_ngn"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={payment.amount}
            className="input-field mt-1"
            disabled={pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Period label (optional)</label>
          <input
            name="period_label"
            defaultValue={payment.periodLabel ?? ""}
            className="input-field mt-1"
            placeholder="e.g. 2026 annual rent"
            disabled={pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Payment date</label>
          <input
            name="payment_date"
            type="date"
            defaultValue={payment.paymentDate?.slice(0, 10) ?? ""}
            className="input-field mt-1"
            disabled={pending}
          />
        </div>
        <LoadingButton type="submit" loading={pending} className="btn-primary w-full">
          Save changes
        </LoadingButton>
      </form>
    </Modal>
  );
}
