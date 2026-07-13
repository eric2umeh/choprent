"use client";

import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/documents/categories";

export function DocumentUploadField({
  name = "documents",
  disabled = false,
  hint = "PDF, images, Word, Excel — multiple files allowed",
  defaultDocType = "other",
  showCategory = true,
  showTitle = false,
}: {
  name?: string;
  disabled?: boolean;
  hint?: string;
  defaultDocType?: string;
  showCategory?: boolean;
  showTitle?: boolean;
}) {
  return (
    <div className="space-y-3">
      {showCategory && (
        <div>
          <label className="text-label normal-case">Document category</label>
          <select
            name="doc_type"
            className="input-field mt-1.5"
            defaultValue={defaultDocType}
            disabled={disabled}
          >
            {DOCUMENT_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {showTitle && (
        <div>
          <label className="text-label normal-case">Title (optional)</label>
          <input
            name="document_title"
            className="input-field mt-1.5"
            placeholder="Uses file name if left blank"
            disabled={disabled}
          />
        </div>
      )}
      <div>
        <label className="text-label normal-case">Documents (optional)</label>
        <input
          name={name}
          type="file"
          multiple
          accept="*/*"
          disabled={disabled}
          className="input-field mt-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-green-100 file:px-2 file:py-1 file:text-green-800"
        />
        <p className="mt-1 text-form-hint">{hint}</p>
      </div>
    </div>
  );
}
