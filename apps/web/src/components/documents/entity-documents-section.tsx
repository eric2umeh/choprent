"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDocument,
  getDocumentDownloadUrl,
} from "@/lib/actions/documents";
import {
  DOCUMENT_CATEGORY_OPTIONS,
  formatDocumentCategory,
} from "@/lib/documents/categories";
import type { DocumentListItem } from "@/lib/data/documents";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel } from "@/components/ui/page-header";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { AddDocumentModal } from "@/components/documents/add-document-modal";
import { EditDocumentModal } from "@/components/documents/edit-document-modal";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";

type UnitOption = { id: string; unitCode: string };
type LeaseOption = { id: string; tenantName: string; unitCode: string; unitId: string };

function issuedDateKey(issuedAt: string): string {
  return issuedAt.slice(0, 10);
}

export function EntityDocumentsSection({
  orgSlug,
  documents,
  canManage,
  sectionTitle = "Documents",
  defaultUnitId,
  defaultLeaseId,
  defaultSiteId,
  units = [],
  leases = [],
  /** Hide section title when nested under page tabs. */
  embedded = false,
  /** Search / category / date filters (tenant Documents tab). */
  enableFilters = false,
}: {
  orgSlug: string;
  documents: DocumentListItem[];
  canManage: boolean;
  sectionTitle?: string;
  defaultUnitId?: string;
  defaultLeaseId?: string;
  defaultSiteId?: string;
  units?: UnitOption[];
  leases?: LeaseOption[];
  embedded?: boolean;
  enableFilters?: boolean;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentListItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [, startDownload] = useTransition();
  const [, startDelete] = useTransition();

  const filtered = useMemo(() => {
    if (!enableFilters) return documents;
    return documents.filter((d) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        formatDocumentCategory(d.docType).toLowerCase().includes(q) ||
        (d.issuedByName?.toLowerCase().includes(q) ?? false);
      const matchCategory =
        categoryFilter === "all" || d.docType === categoryFilter;
      const key = issuedDateKey(d.issuedAt);
      const matchFrom = !dateFrom || key >= dateFrom;
      const matchTo = !dateTo || key <= dateTo;
      return matchSearch && matchCategory && matchFrom && matchTo;
    });
  }, [documents, enableFilters, search, categoryFilter, dateFrom, dateTo]);

  function handleDownload(docId: string) {
    setDownloadingId(docId);
    startDownload(async () => {
      const result = await getDocumentDownloadUrl(orgSlug, docId);
      setDownloadingId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.downloadUrl) window.open(result.downloadUrl, "_blank", "noopener");
    });
  }

  async function handleDelete(doc: DocumentListItem) {
    const { confirmed } = await confirmDialog({
      title: "Delete document?",
      message: `Delete "${doc.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    setBusyId(doc.id);
    startDelete(async () => {
      const result = await deleteDocument(orgSlug, doc.id);
      setBusyId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Document deleted.");
      router.refresh();
    });
  }

  const columns: Column<DocumentListItem>[] = [
    {
      key: "title",
      header: "Document",
      mobilePrimary: true,
      render: (d) => (
        <div>
          <span className="text-table-cell-strong">{d.title}</span>
          <span className="text-table-sub lg:hidden">
            {formatDocumentCategory(d.docType)}
          </span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      className: "hidden lg:table-cell",
      render: (d) => (
        <span className="text-table-cell-muted">
          {formatDocumentCategory(d.docType)}
        </span>
      ),
    },
    {
      key: "uploaded",
      header: "Uploaded",
      mobilePrimary: true,
      render: (d) => (
        <span className="text-table-cell-muted tabular-nums">
          {formatDisplayDate(d.issuedAt)}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "Created by",
      render: (d) => (
        <span className="text-table-cell-muted">{d.issuedByName ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
            disabled={downloadingId === d.id || busyId === d.id}
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(d.id);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            {downloadingId === d.id ? "…" : "Download"}
          </button>
          {canManage && (
            <>
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
                disabled={busyId === d.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingDoc(d);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                className="icon-btn-danger"
                title="Delete document"
                disabled={busyId === d.id}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(d);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPanel>
        {(canManage || !embedded || enableFilters) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3">
            {!embedded ? (
              <h2 className="text-card-title">{sectionTitle}</h2>
            ) : (
              <span className="text-sm text-muted">
                {filtered.length}
                {enableFilters && filtered.length !== documents.length
                  ? ` of ${documents.length}`
                  : ""}{" "}
                document
                {(enableFilters ? filtered.length : documents.length) === 1
                  ? ""
                  : "s"}
              </span>
            )}
            {canManage && (
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="h-4 w-4" />
                Add document
              </button>
            )}
          </div>
        )}
        {enableFilters && (
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search documents…"
          >
            <FilterSelect
              label="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: "all", label: "All categories" },
                ...DOCUMENT_CATEGORY_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                })),
                { value: "statement", label: "Statement" },
                { value: "attachment", label: "Attachment" },
              ]}
            />
            <label className="flex items-center gap-1.5">
              <span className="text-label hidden sm:inline">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="select-field min-w-[8.5rem] font-medium text-foreground"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-label hidden sm:inline">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="select-field min-w-[8.5rem] font-medium text-foreground"
              />
            </label>
          </FilterBar>
        )}
        <ResponsiveDataTable
          rows={filtered}
          columns={columns}
          emptyMessage={
            enableFilters && documents.length > 0
              ? "No documents match these filters."
              : "No documents yet."
          }
        />
      </ListPanel>

      {canManage && (
        <>
          <AddDocumentModal
            orgSlug={orgSlug}
            open={showAdd}
            onClose={() => setShowAdd(false)}
            units={units}
            leases={leases}
            defaultUnitId={defaultUnitId}
            defaultLeaseId={defaultLeaseId}
            defaultSiteId={defaultSiteId}
          />
          <EditDocumentModal
            orgSlug={orgSlug}
            document={editingDoc}
            open={!!editingDoc}
            onClose={() => setEditingDoc(null)}
          />
        </>
      )}
    </>
  );
}
