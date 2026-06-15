"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordCashPayment } from "@/lib/actions/payments";
import { LoadingButton } from "@/components/ui/loading-button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

type UnitOption = { id: string; unitCode: string };

export function RecordCashForm({
  orgSlug,
  units,
  open,
  onClose,
}: {
  orgSlug: string;
  units: UnitOption[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await recordCashPayment(orgSlug, {}, formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Cash payment recorded and allocated.");
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record cash payment"
      description="Verified immediately — allocates to oldest arrears first."
      preventClose={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-label normal-case">Unit</label>
          <select name="unit_id" className="input-field mt-1" required disabled={loading}>
            <option value="">Select unit…</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unitCode}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-label normal-case">Amount (₦)</label>
          <input
            name="amount_ngn"
            type="number"
            min={1}
            step="0.01"
            className="input-field mt-1"
            required
            disabled={loading}
            placeholder="500000"
          />
        </div>
        <div>
          <label className="text-label normal-case">Period label (optional)</label>
          <input
            name="period_label"
            className="input-field mt-1"
            disabled={loading}
            placeholder="2026 partial"
          />
        </div>
        <div>
          <label className="text-label normal-case">Payment date</label>
          <input
            name="payment_date"
            type="date"
            className="input-field mt-1"
            disabled={loading}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Saving…"
            className="btn-primary flex-1 py-2 disabled:opacity-60"
          >
            Save payment
          </LoadingButton>
          <button
            type="button"
            className="btn-ghost flex-1 py-2"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
