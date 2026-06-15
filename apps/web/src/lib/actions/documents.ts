"use server";

import { revalidatePath } from "next/cache";
import { canManageLeases } from "@/lib/auth/roles";
import { requireStaffContext, requireTenantContext } from "@/lib/auth/session";
import { listDocumentsForOrg } from "@/lib/data/documents";
import { getTenantLedger } from "@/lib/data/ledger";
import { buildStatementPdf } from "@/lib/pdf/statement";
import { createSignedStorageUrl } from "@/lib/storage/signed-url";
import { createClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/lib/data/documents";

export type DocumentActionState = {
  error?: string;
  success?: boolean;
  downloadUrl?: string;
};

const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function getDocumentDownloadUrl(
  orgSlug: string,
  documentId: string,
  asTenant = false
): Promise<DocumentActionState> {
  if (asTenant) {
    const ctx = await requireTenantContext(orgSlug);
    const docs = await listDocumentsForOrg(ctx.org.id);
    const doc = docs.find((d) => d.id === documentId);
    if (!doc) return { error: "Document not found." };
    const allowed =
      doc.unitId === null ||
      doc.unitId === ctx.unitId ||
      doc.leaseId === ctx.leaseId;
    if (!allowed) {
      return { error: "You don't have access to this document." };
    }
    if (!doc.filePath) return { error: "File not available." };

    const url = await createSignedStorageUrl("documents", doc.filePath);
    return url ? { downloadUrl: url } : { error: "Could not generate download link." };
  }

  const ctx = await requireStaffContext(orgSlug);

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("management_documents")
    .select("file_url")
    .eq("id", documentId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!doc?.file_url) return { error: "Document not found." };

  const url = await createSignedStorageUrl("documents", doc.file_url);
  return url ? { downloadUrl: url } : { error: "Could not generate download link." };
}

export async function getReceiptDownloadUrl(
  orgSlug: string,
  paymentId: string
): Promise<DocumentActionState> {
  const ctx = await requireStaffContext(orgSlug);

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("receipt_file_url")
    .eq("id", paymentId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!payment?.receipt_file_url) {
    return { error: "No receipt uploaded for this payment." };
  }

  const url = await createSignedStorageUrl("receipts", payment.receipt_file_url);
  return url ? { downloadUrl: url } : { error: "Could not generate download link." };
}

export async function issueDocument(
  orgSlug: string,
  _prev: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role)) {
    return { error: "You don't have permission to issue documents." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const docType = String(formData.get("doc_type") ?? "letter") as DocumentType;
  const unitId = String(formData.get("unit_id") ?? "").trim() || null;
  const file = formData.get("file");

  if (!title) return { error: "Title is required." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Upload a PDF or image file." };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { error: "File must be 20MB or less." };
  }
  if (!ALLOWED_DOC_MIME.has(file.type)) {
    return { error: "Use PDF, JPG, PNG, or WebP." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const path = `${ctx.org.id}/${unitId ?? "plaza"}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  let leaseId: string | null = null;
  if (unitId) {
    const { data: lease } = await supabase
      .from("leases")
      .select("id")
      .eq("unit_id", unitId)
      .eq("status", "active")
      .maybeSingle();
    leaseId = lease?.id ?? null;
  }

  const { error: insertError } = await supabase.from("management_documents").insert({
    organization_id: ctx.org.id,
    unit_id: unitId,
    lease_id: leaseId,
    doc_type: docType,
    title,
    file_url: path,
    issued_by: ctx.user.id,
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([path]);
    return { error: insertError.message };
  }

  revalidatePath(`/d/${orgSlug}/documents`);
  revalidatePath(`/t/${orgSlug}/documents`);
  return { success: true };
}

export async function generateStatement(
  orgSlug: string,
  unitId: string
): Promise<DocumentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role)) {
    return { error: "You don't have permission to generate statements." };
  }

  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("units")
    .select("unit_code, organization_id")
    .eq("id", unitId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!unit) return { error: "Unit not found." };

  const { data: lease } = await supabase
    .from("leases")
    .select("id, tenant_display_name")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  const { lines, balance } = await getTenantLedger(ctx.org.id, unitId);
  const issuedAt = new Date().toISOString().slice(0, 10);
  const title = `Rent statement · Unit ${unit.unit_code} · ${issuedAt}`;

  const pdfBytes = await buildStatementPdf({
    orgName: ctx.org.name,
    unitCode: unit.unit_code,
    tenantName: lease?.tenant_display_name ?? "Tenant",
    balance,
    lines,
    issuedAt,
  });

  const path = `${ctx.org.id}/${unitId}/statement-${issuedAt}-${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, pdfBytes, {
      upsert: false,
      contentType: "application/pdf",
    });

  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("management_documents").insert({
    organization_id: ctx.org.id,
    unit_id: unitId,
    lease_id: lease?.id ?? null,
    doc_type: "statement",
    title,
    file_url: path,
    issued_by: ctx.user.id,
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([path]);
    return { error: insertError.message };
  }

  revalidatePath(`/d/${orgSlug}/documents`);
  revalidatePath(`/t/${orgSlug}/documents`);
  return { success: true };
}
