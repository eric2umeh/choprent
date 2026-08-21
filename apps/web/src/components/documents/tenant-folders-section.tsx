"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDocumentFolder,
  deleteDocumentFolder,
  moveDocumentsToFolder,
  renameDocumentFolder,
} from "@/lib/actions/document-folders";
import type { DocumentFolderItem } from "@/lib/data/document-folders";
import type { DocumentListItem } from "@/lib/data/documents";
import { formatDocumentCategory } from "@/lib/documents/categories";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { ListPanel } from "@/components/ui/page-header";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { getDocumentDownloadUrl } from "@/lib/actions/documents";
import { AddDocumentModal } from "@/components/documents/add-document-modal";
import { EditDocumentModal } from "@/components/documents/edit-document-modal";
import {
  ArrowLeft,
  Download,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

function isRealDocumentId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}

export function TenantFoldersSection({
  orgSlug,
  leaseId,
  unitId,
  folders,
  documents,
  canManage,
}: {
  orgSlug: string;
  leaseId: string;
  unitId: string;
  folders: DocumentFolderItem[];
  documents: DocumentListItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentListItem | null>(null);
  const [, startTransition] = useTransition();

  const fileableDocs = useMemo(
    () => documents.filter((d) => isRealDocumentId(d.id)),
    [documents]
  );

  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;

  const folderDocs = useMemo(() => {
    if (!activeFolderId) return [];
    return fileableDocs.filter((d) => d.folderId === activeFolderId);
  }, [fileableDocs, activeFolderId]);

  const unfiledDocs = useMemo(
    () => fileableDocs.filter((d) => !d.folderId),
    [fileableDocs]
  );

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleCreateFolder() {
    const { confirmed, value } = await confirmDialog({
      title: "New folder",
      message: "Name this folder like you would on your desktop (e.g. 2026 or Rent History).",
      confirmLabel: "Create folder",
      input: {
        label: "Folder name",
        placeholder: "2026",
        defaultValue: String(new Date().getFullYear()),
      },
    });
    if (!confirmed) return;
    const name = value?.trim() ?? "";
    if (!name) {
      toast.error("Enter a folder name.");
      return;
    }

    setBusy(true);
    startTransition(async () => {
      const result = await createDocumentFolder(orgSlug, leaseId, name);
      setBusy(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Folder “${name}” created.`);
      if (result.folderId) setActiveFolderId(result.folderId);
      router.refresh();
    });
  }

  async function handleRenameFolder(folder: DocumentFolderItem) {
    const { confirmed, value } = await confirmDialog({
      title: "Rename folder",
      message: `Rename “${folder.name}”.`,
      confirmLabel: "Save",
      input: {
        label: "Folder name",
        defaultValue: folder.name,
      },
    });
    if (!confirmed) return;
    const name = value?.trim() ?? "";
    if (!name) {
      toast.error("Enter a folder name.");
      return;
    }

    setBusy(true);
    startTransition(async () => {
      const result = await renameDocumentFolder(orgSlug, folder.id, name);
      setBusy(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Folder renamed.");
      router.refresh();
    });
  }

  async function handleDeleteFolder(folder: DocumentFolderItem) {
    const { confirmed } = await confirmDialog({
      title: "Delete folder?",
      message: `Delete “${folder.name}”? Documents inside stay available — they are only removed from this folder.`,
      confirmLabel: "Delete folder",
      destructive: true,
    });
    if (!confirmed) return;

    setBusy(true);
    startTransition(async () => {
      const result = await deleteDocumentFolder(orgSlug, folder.id);
      setBusy(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (activeFolderId === folder.id) setActiveFolderId(null);
      clearSelection();
      toast.success("Folder deleted.");
      router.refresh();
    });
  }

  async function handleMoveSelected(folderId: string | null) {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      toast.error("Select one or more documents first.");
      return;
    }

    setBusy(true);
    startTransition(async () => {
      const result = await moveDocumentsToFolder(
        orgSlug,
        leaseId,
        ids,
        folderId
      );
      setBusy(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      clearSelection();
      setShowMovePicker(false);
      toast.success(
        folderId ? "Moved into folder." : "Removed from folder."
      );
      router.refresh();
    });
  }

  function handleDownload(docId: string) {
    setDownloadingId(docId);
    startTransition(async () => {
      const result = await getDocumentDownloadUrl(orgSlug, docId);
      setDownloadingId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.downloadUrl) window.open(result.downloadUrl, "_blank", "noopener");
    });
  }

  const docColumns: Column<DocumentListItem>[] = [
    {
      key: "select",
      header: "",
      render: (d) =>
        canManage ? (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={selectedIds.has(d.id)}
            onChange={() => toggleSelected(d.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${d.title}`}
          />
        ) : null,
    },
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
      key: "actions",
      header: "",
      render: (d) => (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
            disabled={downloadingId === d.id}
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(d.id);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            {downloadingId === d.id ? "…" : "Download"}
          </button>
          {canManage && (
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setEditingDoc(d);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
          )}
        </div>
      ),
    },
  ];

  if (activeFolder) {
    return (
      <>
        <ListPanel>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-sm"
                onClick={() => {
                  setActiveFolderId(null);
                  clearSelection();
                  setShowMovePicker(false);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Folders
              </button>
              <span className="text-list-meta">/</span>
              <span className="truncate text-card-title">{activeFolder.name}</span>
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-sm"
                    disabled={busy}
                    onClick={() => void handleMoveSelected(null)}
                  >
                    Remove from folder
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
                  disabled={busy}
                  onClick={() => void handleRenameFolder(activeFolder)}
                >
                  <Pencil className="h-4 w-4" />
                  Rename folder
                </button>
                {unfiledDocs.length > 0 && (
                  <button
                    type="button"
                    className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
                    onClick={() => setShowMovePicker((v) => !v)}
                  >
                    Move from Documents
                  </button>
                )}
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="h-4 w-4" />
                  Upload here
                </button>
              </div>
            )}
          </div>

          {canManage && showMovePicker && unfiledDocs.length > 0 && (
            <div className="border-b border-border bg-surface-subtle px-3 py-3">
              <p className="text-sm font-medium text-foreground">
                Move existing documents into “{activeFolder.name}”
              </p>
              <p className="mt-0.5 text-form-hint">
                Tap documents to select them, then confirm. These are uploads from the
                Documents tab that are not in a folder yet.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unfiledDocs.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`rounded-lg border px-2.5 py-1 text-xs ${
                      selectedIds.has(d.id)
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-border bg-white text-foreground"
                    }`}
                    onClick={() => toggleSelected(d.id)}
                  >
                    {d.title}
                  </button>
                ))}
              </div>
              {selectedIds.size > 0 ? (
                <button
                  type="button"
                  className="btn-primary mt-3 px-3 py-1.5 text-sm"
                  disabled={busy}
                  onClick={() => void handleMoveSelected(activeFolder.id)}
                >
                  Move {selectedIds.size} into “{activeFolder.name}”
                </button>
              ) : (
                <p className="mt-2 text-form-hint">Select at least one document.</p>
              )}
            </div>
          )}

          {folderDocs.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Folder className="mx-auto h-10 w-10 text-amber-600" />
              <p className="mt-3 text-list-primary">This folder is empty</p>
              <p className="mt-1 text-list-meta">
                Upload a new file into this folder, or move an existing document from
                Documents.
              </p>
              {canManage && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                    onClick={() => setShowUpload(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Upload document
                  </button>
                  {unfiledDocs.length > 0 && (
                    <button
                      type="button"
                      className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                      onClick={() => setShowMovePicker(true)}
                    >
                      Move from Documents ({unfiledDocs.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <ResponsiveDataTable
              rows={folderDocs}
              columns={docColumns}
              emptyMessage="This folder is empty."
            />
          )}
        </ListPanel>

        {canManage && (
          <>
            <AddDocumentModal
              orgSlug={orgSlug}
              open={showUpload}
              onClose={() => setShowUpload(false)}
              defaultLeaseId={leaseId}
              defaultUnitId={unitId}
              defaultFolderId={activeFolder.id}
              title={`Upload to ${activeFolder.name}`}
              description="File is saved into this folder. You can rename it after upload."
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

  return (
    <ListPanel>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3">
        <div>
          <p className="text-sm text-muted">
            {folders.length} folder{folders.length === 1 ? "" : "s"}
            {unfiledDocs.length > 0
              ? ` · ${unfiledDocs.length} unfiled in Documents`
              : ""}
          </p>
          <p className="mt-0.5 text-form-hint">
            Create year folders (2024, 2025…), open one, then upload or move documents in.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
            disabled={busy}
            onClick={() => void handleCreateFolder()}
          >
            <FolderPlus className="h-4 w-4" />
            New folder
          </button>
        )}
      </div>

      {folders.length === 0 ? (
        <div className="px-3 py-10 text-center">
          <Folder className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 text-list-primary">No folders yet</p>
          <p className="mt-1 text-list-meta">
            Create a folder like 2026, open it, then upload documents into it.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {folders.map((folder) => (
            <li key={folder.id}>
              <div className="flex items-center gap-2 px-3 py-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => {
                    clearSelection();
                    setShowMovePicker(false);
                    setActiveFolderId(folder.id);
                  }}
                >
                  <Folder className="h-5 w-5 shrink-0 text-amber-600" />
                  <span className="min-w-0">
                    <span className="block truncate text-list-primary">
                      {folder.name}
                    </span>
                    <span className="text-list-meta">
                      {folder.documentCount} document
                      {folder.documentCount === 1 ? "" : "s"}
                      {folder.createdByName
                        ? ` · ${folder.createdByName}`
                        : ""}
                    </span>
                  </span>
                </button>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs"
                      disabled={busy}
                      onClick={() => void handleRenameFolder(folder)}
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn-danger"
                      disabled={busy}
                      onClick={() => void handleDeleteFolder(folder)}
                      title="Delete folder"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && unfiledDocs.length > 0 && folders.length > 0 && (
        <div className="border-t border-border px-3 py-3">
          <p className="text-sm font-medium text-foreground">
            Quick move from Documents
          </p>
          <p className="mt-0.5 text-form-hint">
            1) Tap a document to select · 2) Tap a folder name to move it there
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unfiledDocs.slice(0, 12).map((d) => (
              <button
                key={d.id}
                type="button"
                className={`rounded-lg border px-2.5 py-1 text-xs ${
                  selectedIds.has(d.id)
                    ? "border-green-500 bg-green-50 text-green-800"
                    : "border-border bg-white text-foreground"
                }`}
                onClick={() => toggleSelected(d.id)}
              >
                {d.title}
              </button>
            ))}
          </div>
          {selectedIds.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-form-hint">
                Move {selectedIds.size} to:
              </span>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className="btn-ghost px-2.5 py-1 text-xs"
                  disabled={busy}
                  onClick={() => void handleMoveSelected(folder.id)}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </ListPanel>
  );
}
