"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { issueDocument } from "@/lib/actions/documents";
import { DOCUMENT_CATEGORY_OPTIONS } from "@/lib/documents/categories";
import { LoadingButton } from "@/components/ui/loading-button";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "@/components/ui/toast";

type UnitOption = { id: string; unitCode: string };
type LeaseOption = { id: string; tenantName: string; unitCode: string; unitId: string };
type PropertyOption = { id: string; name: string };

export function AddDocumentModal({
  orgSlug,
  open,
  onClose,
  units = [],
  leases = [],
  properties = [],
  defaultUnitId,
  defaultLeaseId,
  defaultSiteId,
  title = "Add document",
}: {
  orgSlug: string;
  open: boolean;
  onClose: () => void;
  units?: UnitOption[];
  leases?: LeaseOption[];
  properties?: PropertyOption[];
  defaultUnitId?: string;
  defaultLeaseId?: string;
  defaultSiteId?: string;
  title?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const showLeasePicker = leases.length > 0 && !defaultLeaseId;
  const showUnitPicker = units.length > 0 && !defaultUnitId && !defaultLeaseId;
  const showPropertyPicker = properties.length > 0 && !defaultSiteId && !defaultUnitId;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (defaultLeaseId) formData.set("lease_id", defaultLeaseId);
    if (defaultUnitId) formData.set("unit_id", defaultUnitId);
    if (defaultSiteId) formData.set("site_id", defaultSiteId);

    const result = await issueDocument(orgSlug, {}, formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Document uploaded.");
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Upload files and choose a category."
      preventClose={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {showPropertyPicker && (
          <div>
            <label className="text-label normal-case">Property</label>
            <select
              name="site_id"
              className="input-field mt-1"
              disabled={loading}
              defaultValue={defaultSiteId ?? ""}
            >
              <option value="">Select property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showLeasePicker && (
          <div>
            <label className="text-label normal-case">Tenant / lease</label>
            <SearchableSelect
              name="lease_id"
              options={leases.map((l) => ({
                value: l.id,
                label: `${l.tenantName} · Unit ${l.unitCode}`,
              }))}
              emptyLabel="Select tenant…"
              placeholder="Search tenant…"
              disabled={loading}
              className="mt-1"
            />
          </div>
        )}

        {showUnitPicker && (
          <div>
            <label className="text-label normal-case">Unit (optional)</label>
            <SearchableSelect
              name="unit_id"
              options={[
                { value: "", label: "Property-wide" },
                ...units.map((u) => ({ value: u.id, label: u.unitCode })),
              ]}
              emptyLabel="Property-wide"
              placeholder="Search unit…"
              disabled={loading}
              className="mt-1"
            />
          </div>
        )}

        <div>
          <label className="text-label normal-case">Category</label>
          <select
            name="doc_type"
            className="input-field mt-1"
            disabled={loading}
            defaultValue="other"
          >
            {DOCUMENT_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-label normal-case">Title (optional)</label>
          <input
            name="title"
            disabled={loading}
            className="input-field mt-1"
            placeholder="Uses file name if left blank"
          />
        </div>

        <div>
          <label className="text-label normal-case">Files</label>
          <input
            name="documents"
            type="file"
            multiple
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
          Upload document
        </LoadingButton>
      </form>
    </Modal>
  );
}
