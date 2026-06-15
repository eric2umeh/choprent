"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { issueDocument } from "@/lib/actions/documents";
import { LoadingButton } from "@/components/ui/loading-button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

export function IssueDocumentForm({
  orgSlug,
  units,
  open,
  onClose,
}: {
  orgSlug: string;
  units: { id: string; unitCode: string }[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await issueDocument(
      orgSlug,
      {},
      new FormData(e.currentTarget),
    );
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Document issued.");
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue document"
      description="Upload a letter, notice, or receipt for tenants to download."
      preventClose={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-label normal-case">Title</label>
          <input
            name="title"
            required
            disabled={loading}
            className="input-field mt-1"
            placeholder="Rent reminder — Q1 2026"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-label normal-case">Type</label>
            <select
              name="doc_type"
              className="input-field mt-1"
              disabled={loading}
            >
              <option value="letter">Letter</option>
              <option value="notice">Notice</option>
              <option value="receipt">Receipt</option>
            </select>
          </div>
          <div>
            <label className="text-label normal-case">Unit (optional)</label>
            <select
              name="unit_id"
              className="input-field mt-1"
              disabled={loading}
            >
              <option value="">Plaza-wide</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unitCode}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-label normal-case">File</label>
          <input
            name="file"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp"
            disabled={loading}
            className="input-field mt-1 file:mr-2 file:rounded file:border-0 file:bg-green-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-green-800"
          />
        </div>
        <LoadingButton
          type="submit"
          loading={loading}
          className="btn-primary w-full"
        >
          Issue document
        </LoadingButton>
      </form>
    </Modal>
  );
}
