"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDocument,
  getDocumentDownloadUrl,
} from "@/lib/actions/documents";
import { formatDocumentCategory } from "@/lib/documents/categories";
import type { DocumentListItem } from "@/lib/data/documents";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { ListPanel } from "@/components/ui/page-header";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { AddDocumentModal } from "@/components/documents/add-document-modal";
import { EditDocumentModal } from "@/components/documents/edit-document-modal";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";

type UnitOption = { id: string; unitCode: string };
type LeaseOption = { id: string; tenantName: string; unitCode: string; unitId: string };

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
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentListItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startDownload] = useTransition();
  const [, startDelete] = useTransition();

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
      message: `Delete “${doc.title}”? This cannot be undone.`,
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3">
          <h2 className="text-card-title">{sectionTitle}</h2>
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
        <ResponsiveDataTable
          rows={documents}
          columns={columns}
          emptyMessage="No documents yet."
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
