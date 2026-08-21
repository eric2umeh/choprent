import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { actorLabel, resolveActorLabels } from "@/lib/data/audit-actors";

export type DocumentType =
  | "tenancy_agreement"
  | "letter"
  | "notice"
  | "receipt"
  | "payment"
  | "maintenance"
  | "issue"
  | "government"
  | "other"
  | "statement"
  | "attachment";

export type DocumentListItem = {
  id: string;
  title: string;
  docType: DocumentType;
  unitCode: string | null;
  unitId: string | null;
  leaseId: string | null;
  siteId: string | null;
  folderId: string | null;
  filePath: string;
  issuedAt: string;
  issuedByName: string | null;
};

type DocumentRow = {
  id: string;
  title: string;
  doc_type: DocumentType;
  unit_id: string | null;
  lease_id: string | null;
  site_id: string | null;
  folder_id?: string | null;
  file_url: string;
  issued_at: string;
  issued_by: string | null;
  units: { unit_code: string } | { unit_code: string }[] | null;
};

function unitCodeFromRow(units: DocumentRow["units"]): string | null {
  if (!units) return null;
  if (Array.isArray(units)) return units[0]?.unit_code ?? null;
  return units.unit_code;
}

const documentSelect =
  "id, title, doc_type, unit_id, lease_id, site_id, folder_id, file_url, issued_at, issued_by, units(unit_code)";

const documentSelectLegacy =
  "id, title, doc_type, unit_id, lease_id, site_id, file_url, issued_at, issued_by, units(unit_code)";

async function mapDocumentRows(
  orgId: string,
  rows: DocumentRow[]
): Promise<DocumentListItem[]> {
  const actors = await resolveActorLabels(
    orgId,
    rows.map((row) => row.issued_by)
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    docType: row.doc_type,
    unitCode: unitCodeFromRow(row.units),
    unitId: row.unit_id,
    leaseId: row.lease_id,
    siteId: row.site_id,
    folderId: row.folder_id ?? null,
    filePath: row.file_url,
    issuedAt: row.issued_at,
    issuedByName: actorLabel(actors, row.issued_by),
  }));
}

async function fetchAllDocumentRows(orgId: string): Promise<DocumentRow[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("management_documents")
      .select(documentSelect)
      .eq("organization_id", orgId)
      .order("issued_at", { ascending: false });

    if (!error && data) return data as DocumentRow[];

    const legacy = await admin
      .from("management_documents")
      .select(documentSelectLegacy)
      .eq("organization_id", orgId)
      .order("issued_at", { ascending: false });
    if (!legacy.error && legacy.data) return legacy.data as DocumentRow[];
  } catch {
    /* fall through */
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("management_documents")
    .select(documentSelectLegacy)
    .eq("organization_id", orgId)
    .order("issued_at", { ascending: false });

  return (data as DocumentRow[] | null) ?? [];
}

async function fetchScopedDocumentRows(
  orgId: string,
  column: "lease_id" | "unit_id",
  value: string
): Promise<DocumentRow[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("management_documents")
      .select(documentSelect)
      .eq("organization_id", orgId)
      .eq(column, value)
      .order("issued_at", { ascending: false });

    if (!error && data) return data as DocumentRow[];

    const legacy = await admin
      .from("management_documents")
      .select(documentSelectLegacy)
      .eq("organization_id", orgId)
      .eq(column, value)
      .order("issued_at", { ascending: false });
    if (!legacy.error && legacy.data) return legacy.data as DocumentRow[];
  } catch {
    /* fall through */
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("management_documents")
    .select(documentSelectLegacy)
    .eq("organization_id", orgId)
    .eq(column, value)
    .order("issued_at", { ascending: false });

  return (data as DocumentRow[] | null) ?? [];
}

export async function listDocumentsForOrg(
  orgId: string
): Promise<DocumentListItem[]> {
  const rows = await fetchAllDocumentRows(orgId);
  return mapDocumentRows(orgId, rows);
}

export async function listDocumentsForLease(
  orgId: string,
  leaseId: string
): Promise<DocumentListItem[]> {
  const rows = await fetchScopedDocumentRows(orgId, "lease_id", leaseId);
  return mapDocumentRows(orgId, rows);
}

export async function listDocumentsForUnit(
  orgId: string,
  unitId: string
): Promise<DocumentListItem[]> {
  const [rows, expenseDocs] = await Promise.all([
    fetchScopedDocumentRows(orgId, "unit_id", unitId),
    listExpenseAttachmentsForUnit(orgId, unitId),
  ]);
  const mapped = await mapDocumentRows(orgId, rows);
  return mergeDocumentLists(mapped, expenseDocs);
}

export async function listDocumentsForProperty(
  orgId: string,
  siteId: string
): Promise<DocumentListItem[]> {
  const admin = createAdminClient();
  const { data: unitRows } = await admin
    .from("units")
    .select("id")
    .eq("organization_id", orgId)
    .eq("site_id", siteId);

  const unitIds = new Set((unitRows ?? []).map((u) => u.id));
  const all = await listDocumentsForOrg(orgId);

  return all.filter(
    (d) =>
      d.siteId === siteId ||
      (d.unitId !== null && unitIds.has(d.unitId))
  );
}

/** Documents visible for a tenancy: lease/unit/property docs + payment receipts (no tenancy agreement). */
export async function listDocumentsForTenant(
  orgId: string,
  unitId: string,
  leaseId: string
): Promise<DocumentListItem[]> {
  const admin = createAdminClient();
  const { data: unit } = await admin
    .from("units")
    .select("site_id")
    .eq("id", unitId)
    .eq("organization_id", orgId)
    .maybeSingle();

  const siteId = unit?.site_id ?? null;

  const [leaseRows, unitDocs, paymentDocs, propertyDocs] = await Promise.all([
    fetchScopedDocumentRows(orgId, "lease_id", leaseId),
    listDocumentsForUnit(orgId, unitId),
    listPaymentAttachmentsForUnit(orgId, unitId),
    siteId
      ? listDocumentsForProperty(orgId, siteId)
      : Promise.resolve([] as DocumentListItem[]),
  ]);
  const leaseDocs = await mapDocumentRows(orgId, leaseRows);

  // Property-level docs for tenants: site-wide letters (no unit) + this unit's docs.
  // Exclude other shops' unit-scoped documents from the same property.
  const propertyVisible = propertyDocs.filter(
    (d) => d.unitId === null || d.unitId === unitId
  );

  return mergeDocumentLists(
    leaseDocs,
    unitDocs,
    paymentDocs,
    propertyVisible
  ).filter((d) => d.docType !== "tenancy_agreement");
}

function mergeDocumentLists(
  ...lists: DocumentListItem[][]
): DocumentListItem[] {
  const seenPaths = new Set<string>();
  const seenIds = new Set<string>();
  const merged: DocumentListItem[] = [];
  for (const list of lists) {
    for (const doc of list) {
      if (seenIds.has(doc.id) || seenPaths.has(doc.filePath)) continue;
      seenIds.add(doc.id);
      seenPaths.add(doc.filePath);
      merged.push(doc);
    }
  }
  return merged.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

function expenseCategoryToDocType(category: string): DocumentType {
  if (category === "government") return "government";
  if (category === "maintenance" || category === "repairs") return "maintenance";
  if (category === "other") return "other";
  return "attachment";
}

/** Payment receipts for a unit — shown in the tenant Docs folder. */
async function listPaymentAttachmentsForUnit(
  orgId: string,
  unitId: string
): Promise<DocumentListItem[]> {
  try {
    const admin = createAdminClient();
    const { data: payments, error } = await admin
      .from("payments")
      .select(
        "id, amount_ngn, payment_date, created_at, receipt_file_url, period_label, status, recorded_by, payment_attachments(id, file_url, file_name, created_at)"
      )
      .eq("organization_id", orgId)
      .eq("unit_id", unitId)
      .in("status", ["pending", "verified", "auto_matched"])
      .order("created_at", { ascending: false });

    if (error || !payments?.length) return [];

    const docs: DocumentListItem[] = [];

    for (const payment of payments) {
      const date = String(
        (payment.payment_date ?? payment.created_at ?? "").toString().slice(0, 10)
      );
      const amount = Number(payment.amount_ngn);
      const period = payment.period_label
        ? ` · ${payment.period_label}`
        : "";
      const titleBase = `Payment receipt${period} · ₦${amount.toLocaleString("en-NG")}`;

      const attachments = payment.payment_attachments as
        | { id: string; file_url: string; file_name: string | null; created_at: string }[]
        | null;

      if (attachments?.length) {
        for (const att of attachments) {
          if (!att.file_url) continue;
          docs.push({
            id: `payment-att:${att.id}`,
            title: att.file_name?.trim() || titleBase,
            docType: "receipt",
            unitCode: null,
            unitId,
            leaseId: null,
            siteId: null,
            folderId: null,
            filePath: att.file_url,
            issuedAt: String(att.created_at).slice(0, 10) || date,
            issuedByName: null,
          });
        }
        continue;
      }

      if (payment.receipt_file_url) {
        docs.push({
          id: `payment:${payment.id}`,
          title: titleBase,
          docType: "receipt",
          unitCode: null,
          unitId,
          leaseId: null,
          siteId: null,
          folderId: null,
          filePath: payment.receipt_file_url as string,
          issuedAt: date,
          issuedByName: null,
        });
      }
    }

    return docs;
  } catch {
    return [];
  }
}

/** Expense attachments on a unit that may not yet have a management_documents row. */
async function listExpenseAttachmentsForUnit(
  orgId: string,
  unitId: string
): Promise<DocumentListItem[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("property_expenses")
      .select(
        "id, description, category, attachment_url, expense_date, created_by, unit_id, site_id, units(unit_code)"
      )
      .eq("organization_id", orgId)
      .eq("unit_id", unitId)
      .not("attachment_url", "is", null)
      .order("expense_date", { ascending: false });

    if (error || !data?.length) return [];

    const actors = await resolveActorLabels(
      orgId,
      data.map((row) => row.created_by as string | null)
    );

    return data
      .filter((row) => typeof row.attachment_url === "string" && row.attachment_url.length > 0)
      .map((row) => {
        const units = row.units as
          | { unit_code: string }
          | { unit_code: string }[]
          | null;
        const unitCode = Array.isArray(units)
          ? units[0]?.unit_code ?? null
          : units?.unit_code ?? null;

        return {
          id: `expense:${row.id}`,
          title: row.description as string,
          docType: expenseCategoryToDocType(String(row.category)),
          unitCode,
          unitId: (row.unit_id as string) ?? unitId,
          leaseId: null,
          siteId: (row.site_id as string) ?? null,
          folderId: null,
          filePath: row.attachment_url as string,
          issuedAt: String(row.expense_date),
          issuedByName: actorLabel(actors, row.created_by as string | null),
        } satisfies DocumentListItem;
      });
  } catch {
    return [];
  }
}
