"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDocument } from "@/lib/actions/documents";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/documents/categories";
import type { DocumentListItem } from "@/lib/data/documents";
import { LoadingButton } from "@/components/ui/loading-button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

export function EditDocumentModal({
  orgSlug,
  document,
  open,
  onClose,
}: {
  orgSlug: string;
  document: DocumentListItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!document) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!document) return;
    setLoading(true);
    const result = await updateDocument(
      orgSlug,
      document.id,
      new FormData(e.currentTarget)
    );
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Document updated.");
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit document"
      description="Update the title, category, or replace the file."
      preventClose={loading}
    >
      <form key={document.id} onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-label normal-case">Title</label>
          <input
            name="title"
            required
            disabled={loading}
            defaultValue={document.title}
            className="input-field mt-1"
          />
        </div>

        <div>
          <label className="text-label normal-case">Category</label>
          <select
            name="doc_type"
            className="input-field mt-1"
            disabled={loading}
            defaultValue={
              DOCUMENT_CATEGORY_OPTIONS.some((o) => o.value === document.docType)
                ? document.docType
                : "other"
            }
          >
            {DOCUMENT_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-label normal-case">Replace file (optional)</label>
          <input
            name="file"
            type="file"
            accept="*/*"
            disabled={loading}
            className="input-field mt-1 file:mr-2 file:rounded file:border-0 file:bg-green-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-green-800"
          />
          <p className="mt-1 text-form-hint">Leave blank to keep the current file.</p>
        </div>

        <LoadingButton
          type="submit"
          loading={loading}
          className="btn-primary w-full"
        >
          Save changes
        </LoadingButton>
      </form>
    </Modal>
  );
}
