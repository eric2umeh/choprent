"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CompactCard } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  ResponsiveDataTable,
  type Column,
} from "@/components/ui/responsive-table";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { IssueDocumentForm } from "@/components/documents/issue-document-form";
import {
  generateStatement,
  getDocumentDownloadUrl,
} from "@/lib/actions/documents";
import type { DocumentListItem, DocumentType } from "@/lib/data/documents";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Download, FileText } from "lucide-react";

function docTypeVariant(type: DocumentType) {
  if (type === "notice") return "warning" as const;
  if (type === "receipt") return "success" as const;
  return "muted" as const;
}

export function DocumentsList({
  orgSlug,
  documents,
  units = [],
  canManage = false,
  tenantOnly = false,
}: {
  orgSlug: string;
  documents: DocumentListItem[];
  units?: { id: string; unitCode: string }[];
  canManage?: boolean;
  tenantOnly?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [generatingUnitId, setGeneratingUnitId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        (d.unitCode?.toLowerCase().includes(q) ?? false);
      const matchType = typeFilter === "all" || d.docType === typeFilter;
      const matchScope =
        scopeFilter === "all" ||
        (scopeFilter === "plaza" && !d.unitCode) ||
        (scopeFilter === "unit" && !!d.unitCode);
      return matchSearch && matchType && matchScope;
    });
  }, [documents, search, typeFilter, scopeFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(
    filtered,
    8,
  );

  function handleDownload(docId: string) {
    setDownloadingId(docId);
    startTransition(async () => {
      const result = await getDocumentDownloadUrl(orgSlug, docId, tenantOnly);
      setDownloadingId(null);
      if (result.error) toast.error(result.error);
      else if (result.downloadUrl) window.open(result.downloadUrl, "_blank");
    });
  }

  function handleGenerateStatement(unitId: string) {
    setGeneratingUnitId(unitId);
    startTransition(async () => {
      const result = await generateStatement(orgSlug, unitId);
      setGeneratingUnitId(null);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Statement generated.");
        router.refresh();
      }
    });
  }

  const columns: Column<DocumentListItem>[] = [
    {
      key: "title",
      header: "Document",
      mobilePrimary: true,
      render: (d) => <span className="text-table-cell-strong">{d.title}</span>,
    },
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      render: (d) => (
        <span className="text-table-cell-muted">
          {d.unitCode ? `Unit ${d.unitCode}` : "Plaza-wide"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      mobilePrimary: true,
      render: (d) => (
        <Badge variant={docTypeVariant(d.docType)} className="capitalize">
          {d.docType}
        </Badge>
      ),
    },
    {
      key: "issued",
      header: "Issued",
      render: (d) => (
        <span className="text-table-cell-muted tabular-nums">{d.issuedAt}</span>
      ),
    },
    {
      key: "action",
      header: "",
      render: (d) => (
        <button
          type="button"
          className="btn-ghost inline-flex gap-1 px-2 py-1"
          disabled={!d.filePath || downloadingId === d.id}
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(d.id);
          }}
        >
          {downloadingId === d.id ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Download</span>
        </button>
      ),
    },
  ];

  return (
    <>
      <ListToolbar>
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search title or unit…"
        >
          <FilterSelect
            label="Type"
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All types" },
              { value: "letter", label: "Letter" },
              { value: "notice", label: "Notice" },
              { value: "statement", label: "Statement" },
              { value: "receipt", label: "Receipt" },
            ]}
          />
          {!tenantOnly && (
            <FilterSelect
              label="Scope"
              value={scopeFilter}
              onChange={(v) => {
                setScopeFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All scope" },
                { value: "unit", label: "Unit-specific" },
                { value: "plaza", label: "Plaza-wide" },
              ]}
            />
          )}
        </FilterBar>
        <div className="flex flex-wrap items-center gap-2 px-3 lg:px-0">
          <ViewToggle value={view} onChange={setView} />
          {canManage && units.length > 0 && (
            <select
              className="input-field max-w-[9rem] py-1.5 text-xs"
              defaultValue=""
              disabled={!!generatingUnitId}
              onChange={(e) => {
                const unitId = e.target.value;
                e.target.value = "";
                if (unitId) handleGenerateStatement(unitId);
              }}
            >
              <option value="">Generate statement…</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.unitCode}
                </option>
              ))}
            </select>
          )}
          {canManage && (
            <button
              type="button"
              className="btn-primary px-3 py-1.5"
              onClick={() => setShowIssueForm(true)}
            >
              Issue document
            </button>
          )}
        </div>
      </ListToolbar>

      <ListPanel>
        {view === "table" ? (
          <ResponsiveDataTable
            rows={slice}
            columns={columns}
            emptyMessage="No documents match your filters"
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {slice.map((doc) => (
              <CompactCard key={doc.id}>
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-list-primary">{doc.title}</p>
                    <p className="text-list-meta">
                      {doc.unitCode ? `Unit ${doc.unitCode}` : "Plaza-wide"} ·{" "}
                      {doc.issuedAt}
                    </p>
                  </div>
                  <Badge
                    variant={docTypeVariant(doc.docType)}
                    className="capitalize shrink-0"
                  >
                    {doc.docType}
                  </Badge>
                </div>
                <button
                  type="button"
                  className="btn-ghost mt-2 w-full py-1.5 text-xs"
                  disabled={!doc.filePath || downloadingId === doc.id}
                  onClick={() => handleDownload(doc.id)}
                >
                  {downloadingId === doc.id ? (
                    <Spinner className="mr-1 inline h-3.5 w-3.5" />
                  ) : (
                    <Download className="mr-1 inline h-3.5 w-3.5" />
                  )}
                  Download
                </button>
              </CompactCard>
            ))}
          </div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          pageSize={pageSize}
        />
      </ListPanel>

      {canManage && (
        <IssueDocumentForm
          orgSlug={orgSlug}
          units={units}
          open={showIssueForm}
          onClose={() => setShowIssueForm(false)}
        />
      )}
    </>
  );
}
