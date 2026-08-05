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
import { formatDisplayDate } from "@/lib/utils/format-date";
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
  const [unitFilter, setUnitFilter] = useState("all");
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
      const matchUnit =
        unitFilter === "all" ||
        (unitFilter === "plaza" && !d.unitId) ||
        d.unitId === unitFilter;
      return matchSearch && matchType && matchScope && matchUnit;
    });
  }, [documents, search, typeFilter, scopeFilter, unitFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(filtered);

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
      className: "w-[36%]",
      render: (d) => (
        <p className="break-words text-table-cell-strong leading-snug">
          {d.title}
        </p>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      className: "w-[14%]",
      render: (d) => (
        <span className="text-table-cell">
          {d.unitCode ? `Unit ${d.unitCode}` : "Plaza-wide"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      mobilePrimary: true,
      className: "w-[12%]",
      render: (d) => (
        <Badge variant={docTypeVariant(d.docType)} className="capitalize">
          {d.docType}
        </Badge>
      ),
    },
    {
      key: "issued",
      header: "Issued",
      className: "w-[18%]",
      render: (d) => (
        <div>
          <span className="text-table-cell tabular-nums">
            {formatDisplayDate(d.issuedAt)}
          </span>
          {d.issuedByName && (
            <p className="mt-0.5 text-[11px] text-muted">{d.issuedByName}</p>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "",
      mobilePrimary: true,
      className: "w-[7.5rem]",
      render: (d) => (
        <button
          type="button"
          className="btn-ghost inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5"
          disabled={!d.filePath || downloadingId === d.id}
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(d.id);
          }}
        >
          {downloadingId === d.id ? (
            <Spinner className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Download className="h-3.5 w-3.5 shrink-0" />
          )}
          Download
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
              { value: "attachment", label: "Attachment" },
              { value: "letter", label: "Letter" },
              { value: "notice", label: "Notice" },
              { value: "government", label: "Government" },
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
          {!tenantOnly && units.length > 0 && (
            <FilterSelect
              label="Unit"
              value={unitFilter}
              onChange={(v) => {
                setUnitFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All units" },
                { value: "plaza", label: "Plaza-wide only" },
                ...units.map((u) => ({
                  value: u.id,
                  label: `Unit ${u.unitCode}`,
                })),
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
          tenantOnly ? (
            slice.length === 0 ? (
              <div className="px-3 py-10 text-center text-empty-state">
                No documents match your filters
              </div>
            ) : (
              <div className="divide-y divide-border">
                {slice.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 bg-white px-3 py-3.5"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words text-table-cell-strong leading-snug">
                          {doc.title}
                        </p>
                        <Badge
                          variant={docTypeVariant(doc.docType)}
                          className="shrink-0 capitalize"
                        >
                          {doc.docType}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground/80">
                        {doc.unitCode ? `Unit ${doc.unitCode}` : "Plaza-wide"}
                      </p>
                      <p className="text-list-meta leading-normal">
                        {formatDisplayDate(doc.issuedAt)}
                        {doc.issuedByName ? ` · ${doc.issuedByName}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5"
                      disabled={!doc.filePath || downloadingId === doc.id}
                      onClick={() => handleDownload(doc.id)}
                    >
                      {downloadingId === doc.id ? (
                        <Spinner className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Download className="h-3.5 w-3.5 shrink-0" />
                      )}
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <ResponsiveDataTable
              rows={slice}
              columns={columns}
              emptyMessage="No documents match your filters"
            />
          )
        ) : (
          <div
            className={
              tenantOnly
                ? "grid grid-cols-1 gap-3 p-3"
                : "grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3"
            }
          >
            {slice.length === 0 ? (
              <p className="col-span-full px-1 py-8 text-center text-empty-state">
                No documents match your filters
              </p>
            ) : (
              slice.map((doc) => (
                <CompactCard
                  key={doc.id}
                  className="flex flex-col gap-3 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="line-clamp-2 text-list-primary leading-snug">
                          {doc.title}
                        </p>
                        <p className="text-sm font-medium text-foreground/80">
                          {doc.unitCode
                            ? `Unit ${doc.unitCode}`
                            : "Plaza-wide"}
                        </p>
                        <p className="text-list-meta leading-normal">
                          {formatDisplayDate(doc.issuedAt)}
                          {doc.issuedByName ? ` · ${doc.issuedByName}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={docTypeVariant(doc.docType)}
                      className="shrink-0 capitalize"
                    >
                      {doc.docType}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost inline-flex w-full items-center justify-center gap-1.5 py-2 text-xs"
                    disabled={!doc.filePath || downloadingId === doc.id}
                    onClick={() => handleDownload(doc.id)}
                  >
                    {downloadingId === doc.id ? (
                      <Spinner className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Download className="h-3.5 w-3.5 shrink-0" />
                    )}
                    Download
                  </button>
                </CompactCard>
              ))
            )}
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
