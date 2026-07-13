"use server";

import { revalidatePath } from "next/cache";
import { canManageLeases } from "@/lib/auth/roles";
import { requireStaffContext, requireTenantContext } from "@/lib/auth/session";
import {
  listDocumentsForOrg,
  type DocumentType,
} from "@/lib/data/documents";
import { getTenantLedger } from "@/lib/data/ledger";
import { parseDocumentType } from "@/lib/documents/categories";
import {
  collectFilesFromFormData,
  insertManagementDocuments,
  readDocumentUploadFromFormData,
} from "@/lib/documents/upload";
import { buildStatementPdf } from "@/lib/pdf/statement";
import { createSignedStorageUrl } from "@/lib/storage/signed-url";
import { createAdminClient } from "@/lib/supabase/admin";

export type DocumentActionState = {
  error?: string;
  success?: boolean;
  downloadUrl?: string;
};

function revalidateDocumentPaths(orgSlug: string) {
  revalidatePath(`/d/${orgSlug}/tenants`);
  revalidatePath(`/d/${orgSlug}/properties`);
  revalidatePath(`/t/${orgSlug}/documents`);
}

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

    const { recordTenantEngagementInternal } = await import(
      "@/lib/actions/tenant-activity-internal"
    );
    await recordTenantEngagementInternal({
      orgId: ctx.org.id,
      tenantUserId: ctx.user.id,
      leaseId: ctx.leaseId,
      unitId: ctx.unitId,
      eventType:
        doc.docType === "statement" ? "statement_downloaded" : "document_downloaded",
      metadata: { document_id: documentId, title: doc.title },
    });

    const url = await createSignedStorageUrl("documents", doc.filePath);
    return url ? { downloadUrl: url } : { error: "Could not generate download link." };
  }

  const ctx = await requireStaffContext(orgSlug);
  const admin = createAdminClient();
  const { data: doc } = await admin
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
  const admin = createAdminClient();
  const { data: payment } = await admin
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
    return { error: "You don't have permission to upload documents." };
  }

  const { files, docType, title } = readDocumentUploadFromFormData(formData);
  const unitId = String(formData.get("unit_id") ?? "").trim() || null;
  const leaseId = String(formData.get("lease_id") ?? "").trim() || null;
  const siteId = String(formData.get("site_id") ?? "").trim() || null;

  if (files.length === 0) return { error: "Choose at least one file to upload." };

  const admin = createAdminClient();

  let resolvedLeaseId = leaseId;
  let resolvedSiteId = siteId;
  let resolvedUnitId = unitId;

  if (unitId && !leaseId) {
    const { data: lease } = await admin
      .from("leases")
      .select("id")
      .eq("unit_id", unitId)
      .eq("status", "active")
      .maybeSingle();
    resolvedLeaseId = lease?.id ?? null;
  }

  if (leaseId && !unitId) {
    const { data: lease } = await admin
      .from("leases")
      .select("unit_id, units!inner(site_id)")
      .eq("id", leaseId)
      .maybeSingle();
    if (lease) {
      resolvedUnitId = lease.unit_id;
      const units = lease.units as { site_id: string } | { site_id: string }[] | null;
      resolvedSiteId = Array.isArray(units) ? units[0]?.site_id : units?.site_id ?? null;
    }
  }

  if (unitId && !siteId) {
    const { data: unit } = await admin
      .from("units")
      .select("site_id")
      .eq("id", unitId)
      .eq("organization_id", ctx.org.id)
      .maybeSingle();
    resolvedSiteId = unit?.site_id ?? null;
  }

  const result = await insertManagementDocuments({
    admin,
    orgId: ctx.org.id,
    userId: ctx.user.id,
    files,
    docType,
    title: title || undefined,
    unitId: resolvedUnitId,
    leaseId: resolvedLeaseId,
    siteId: resolvedSiteId,
  });

  if (result.error) return { error: result.error };

  revalidateDocumentPaths(orgSlug);
  if (leaseId) revalidatePath(`/d/${orgSlug}/tenants/${leaseId}`);
  return { success: true };
}

export async function generateStatement(
  orgSlug: string,
  unitId: string
): Promise<DocumentActionState> {
  try {
    const ctx = await requireStaffContext(orgSlug);
    if (!canManageLeases(ctx.role)) {
      return { error: "You don't have permission to generate statements." };
    }

    const admin = createAdminClient();

    const { data: unit } = await admin
      .from("units")
      .select("unit_code, organization_id, site_id")
      .eq("id", unitId)
      .eq("organization_id", ctx.org.id)
      .maybeSingle();

    if (!unit) return { error: "Unit not found." };

    const { data: lease } = await admin
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
    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(path, pdfBytes, {
        upsert: false,
        contentType: "application/pdf",
      });

    if (uploadError) return { error: uploadError.message };

    const { error: insertError } = await admin.from("management_documents").insert({
      organization_id: ctx.org.id,
      site_id: unit.site_id,
      unit_id: unitId,
      lease_id: lease?.id ?? null,
      doc_type: "statement" satisfies DocumentType,
      title,
      file_url: path,
      issued_by: ctx.user.id,
    });

    if (insertError) {
      await admin.storage.from("documents").remove([path]);
      return { error: insertError.message };
    }

    revalidateDocumentPaths(orgSlug);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not generate statement. Try again.",
    };
  }
}

export async function uploadLeaseDocumentsFromForm(
  orgSlug: string,
  formData: FormData,
  leaseId: string,
  unitId: string,
  siteId: string | null
): Promise<DocumentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role)) {
    return { error: "You don't have permission to upload documents." };
  }

  const files = collectFilesFromFormData(formData);
  if (files.length === 0) return { success: true };

  const docType = parseDocumentType(String(formData.get("doc_type") ?? "tenancy_agreement"));
  const title = String(formData.get("document_title") ?? "").trim() || undefined;

  const admin = createAdminClient();
  const result = await insertManagementDocuments({
    admin,
    orgId: ctx.org.id,
    userId: ctx.user.id,
    files,
    docType,
    title,
    unitId,
    leaseId,
    siteId,
  });

  if (result.error) return { error: result.error };
  revalidateDocumentPaths(orgSlug);
  revalidatePath(`/d/${orgSlug}/tenants/${leaseId}`);
  return { success: true };
}
