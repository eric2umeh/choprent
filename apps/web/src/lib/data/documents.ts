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
  } catch {
    /* fall through */
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("management_documents")
    .select(documentSelect)
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
  } catch {
    /* fall through */
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("management_documents")
    .select(documentSelect)
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
  const rows = await fetchScopedDocumentRows(orgId, "unit_id", unitId);
  return mapDocumentRows(orgId, rows);
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

export async function listDocumentsForTenant(
  orgId: string,
  unitId: string,
  leaseId: string
): Promise<DocumentListItem[]> {
  const all = await listDocumentsForOrg(orgId);
  return all.filter(
    (d) =>
      d.leaseId === leaseId ||
      d.unitId === unitId ||
      (d.unitId === null && d.leaseId === null)
  );
}
