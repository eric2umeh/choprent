import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DocumentType = "letter" | "notice" | "receipt" | "statement";

export type DocumentListItem = {
  id: string;
  title: string;
  docType: DocumentType;
  unitCode: string | null;
  unitId: string | null;
  leaseId: string | null;
  filePath: string;
  issuedAt: string;
};

type DocumentRow = {
  id: string;
  title: string;
  doc_type: DocumentType;
  unit_id: string | null;
  lease_id: string | null;
  file_url: string;
  issued_at: string;
  units: { unit_code: string } | { unit_code: string }[] | null;
};

function unitCodeFromRow(units: DocumentRow["units"]): string | null {
  if (!units) return null;
  if (Array.isArray(units)) return units[0]?.unit_code ?? null;
  return units.unit_code;
}

function mapRow(row: DocumentRow): DocumentListItem {
  return {
    id: row.id,
    title: row.title,
    docType: row.doc_type,
    unitCode: unitCodeFromRow(row.units),
    unitId: row.unit_id,
    leaseId: row.lease_id,
    filePath: row.file_url,
    issuedAt: row.issued_at.slice(0, 10),
  };
}

export async function listDocumentsForOrg(
  orgId: string
): Promise<DocumentListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("management_documents")
    .select(
      "id, title, doc_type, unit_id, lease_id, file_url, issued_at, units(unit_code)"
    )
    .eq("organization_id", orgId)
    .order("issued_at", { ascending: false });

  if (error || !data) {
    try {
      const admin = createAdminClient();
      const { data: adminRows } = await admin
        .from("management_documents")
        .select(
          "id, title, doc_type, unit_id, lease_id, file_url, issued_at, units(unit_code)"
        )
        .eq("organization_id", orgId)
        .order("issued_at", { ascending: false });
      return (adminRows as DocumentRow[] | null)?.map(mapRow) ?? [];
    } catch {
      return [];
    }
  }

  return (data as DocumentRow[]).map(mapRow);
}

export async function listDocumentsForTenant(
  orgId: string,
  unitId: string,
  leaseId: string
): Promise<DocumentListItem[]> {
  const all = await listDocumentsForOrg(orgId);
  return all.filter(
    (d) =>
      d.unitId === null ||
      d.unitId === unitId ||
      d.leaseId === leaseId
  );
}
