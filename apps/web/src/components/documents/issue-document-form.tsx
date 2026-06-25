"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { issueDocument } from "@/lib/actions/documents";
import { LoadingButton } from "@/components/ui/loading-button";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
      description="Upload any file — PDF, images, Word, Excel, and more."
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
              defaultValue="attachment"
            >
              <option value="attachment">Attachment</option>
              <option value="letter">Letter</option>
              <option value="notice">Notice</option>
              <option value="receipt">Receipt</option>
            </select>
          </div>
          <div>
            <label className="text-label normal-case">Unit (optional)</label>
            <SearchableSelect
              name="unit_id"
              options={[
                { value: "", label: "Plaza-wide" },
                ...units.map((u) => ({ value: u.id, label: u.unitCode })),
              ]}
              emptyLabel="Plaza-wide"
              placeholder="Search unit…"
              disabled={loading}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <label className="text-label normal-case">File</label>
          <input
            name="file"
            type="file"
            required
            accept="*/*"
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
