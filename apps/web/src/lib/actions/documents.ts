"use server";

import { revalidatePath } from "next/cache";
import { canManageDocumentFolders, canManageLeases } from "@/lib/auth/roles";
import { requireStaffContext, requireTenantContext } from "@/lib/auth/session";
import {
  listDocumentsForOrg,
  type DocumentType,
} from "@/lib/data/documents";
import { getTenantLedger } from "@/lib/data/ledger";
import { parseDocumentType } from "@/lib/documents/categories";
import {
  collectFilesFromFormData,
  inferContentType,
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

    if (documentId.startsWith("expense:")) {
      const expenseId = documentId.slice("expense:".length);
      const admin = createAdminClient();
      const { data: expense } = await admin
        .from("property_expenses")
        .select("attachment_url, unit_id")
        .eq("id", expenseId)
        .eq("organization_id", ctx.org.id)
        .maybeSingle();

      if (!expense?.attachment_url || expense.unit_id !== ctx.unitId) {
        return { error: "You don't have access to this document." };
      }

      const url = await createSignedStorageUrl("documents", expense.attachment_url);
      return url ? { downloadUrl: url } : { error: "Could not generate download link." };
    }

    if (
      documentId.startsWith("payment:") ||
      documentId.startsWith("payment-att:")
    ) {
      const admin = createAdminClient();
      let filePath: string | null = null;

      if (documentId.startsWith("payment-att:")) {
        const attId = documentId.slice("payment-att:".length);
        const { data: att } = await admin
          .from("payment_attachments")
          .select("file_url, payment_id, payments!inner(unit_id, organization_id)")
          .eq("id", attId)
          .maybeSingle();
        const pay = att?.payments as
          | { unit_id: string; organization_id: string }
          | { unit_id: string; organization_id: string }[]
          | null;
        const payment = Array.isArray(pay) ? pay[0] : pay;
        if (
          !att?.file_url ||
          !payment ||
          payment.organization_id !== ctx.org.id ||
          payment.unit_id !== ctx.unitId
        ) {
          return { error: "You don't have access to this document." };
        }
        filePath = att.file_url;
      } else {
        const paymentId = documentId.slice("payment:".length);
        const { data: payment } = await admin
          .from("payments")
          .select("receipt_file_url, unit_id")
          .eq("id", paymentId)
          .eq("organization_id", ctx.org.id)
          .maybeSingle();
        if (
          !payment?.receipt_file_url ||
          payment.unit_id !== ctx.unitId
        ) {
          return { error: "You don't have access to this document." };
        }
        filePath = payment.receipt_file_url;
      }

      if (!filePath) {
        return { error: "You don't have access to this document." };
      }

      const url = await createSignedStorageUrl("receipts", filePath);
      return url ? { downloadUrl: url } : { error: "Could not generate download link." };
    }

    const docs = await listDocumentsForOrg(ctx.org.id);
    const doc = docs.find((d) => d.id === documentId);
    if (!doc) return { error: "Document not found." };
    if (doc.docType === "tenancy_agreement") {
      return { error: "You don't have access to this document." };
    }

    let tenantSiteId: string | null = null;
    if (doc.unitId === null && doc.siteId) {
      const admin = createAdminClient();
      const { data: unit } = await admin
        .from("units")
        .select("site_id")
        .eq("id", ctx.unitId)
        .maybeSingle();
      tenantSiteId = unit?.site_id ?? null;
    }

    const allowed =
      doc.leaseId === ctx.leaseId ||
      doc.unitId === ctx.unitId ||
      (doc.unitId === null &&
        (doc.siteId === null || doc.siteId === tenantSiteId));
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

  if (documentId.startsWith("expense:")) {
    const expenseId = documentId.slice("expense:".length);
    const { data: expense } = await admin
      .from("property_expenses")
      .select("attachment_url")
      .eq("id", expenseId)
      .eq("organization_id", ctx.org.id)
      .maybeSingle();

    if (!expense?.attachment_url) return { error: "Document not found." };
    const url = await createSignedStorageUrl("documents", expense.attachment_url);
    return url ? { downloadUrl: url } : { error: "Could not generate download link." };
  }

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
  const folderId = String(formData.get("folder_id") ?? "").trim() || null;
  const canUpload =
    canManageLeases(ctx.role) ||
    (folderId !== null && canManageDocumentFolders(ctx.role));
  if (!canUpload) {
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
  let resolvedFolderId = folderId;

  if (folderId) {
    const { data: folder } = await admin
      .from("document_folders")
      .select("id, lease_id, unit_id, organization_id")
      .eq("id", folderId)
      .eq("organization_id", ctx.org.id)
      .maybeSingle();
    if (!folder) return { error: "Folder not found." };
    resolvedLeaseId = resolvedLeaseId || folder.lease_id;
    resolvedUnitId = resolvedUnitId || folder.unit_id;
    resolvedFolderId = folder.id;
  }

  if (unitId && !leaseId && !resolvedLeaseId) {
    const { data: lease } = await admin
      .from("leases")
      .select("id")
      .eq("unit_id", unitId)
      .eq("status", "active")
      .maybeSingle();
    resolvedLeaseId = lease?.id ?? null;
  }

  if ((leaseId || resolvedLeaseId) && !unitId && !resolvedUnitId) {
    const { data: lease } = await admin
      .from("leases")
      .select("unit_id, units!inner(site_id)")
      .eq("id", leaseId || resolvedLeaseId)
      .maybeSingle();
    if (lease) {
      resolvedUnitId = lease.unit_id;
      const units = lease.units as { site_id: string } | { site_id: string }[] | null;
      resolvedSiteId = Array.isArray(units) ? units[0]?.site_id : units?.site_id ?? null;
    }
  }

  if ((unitId || resolvedUnitId) && !siteId && !resolvedSiteId) {
    const { data: unit } = await admin
      .from("units")
      .select("site_id")
      .eq("id", unitId || resolvedUnitId)
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
    folderId: resolvedFolderId,
  });

  if (result.error) return { error: result.error };

  revalidateDocumentPaths(orgSlug);
  if (resolvedLeaseId) revalidatePath(`/d/${orgSlug}/tenants/${resolvedLeaseId}`);
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

function docTypeToExpenseCategory(docType: DocumentType): string {
  if (docType === "government") return "government";
  if (docType === "maintenance") return "maintenance";
  return "other";
}

async function uploadReplacementFile(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  unitId: string | null,
  siteId: string | null,
  file: File
): Promise<{ path?: string; error?: string }> {
  if (file.size > 20 * 1024 * 1024) {
    return { error: "File must be 20MB or less." };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const contentType = inferContentType(file, ext);
  const path = `${orgId}/${unitId ?? siteId ?? "plaza"}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from("documents")
    .upload(path, file, { upsert: false, contentType });
  if (error) return { error: error.message };
  return { path };
}

export async function updateDocument(
  orgSlug: string,
  documentId: string,
  formData: FormData
): Promise<DocumentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role) && !canManageDocumentFolders(ctx.role)) {
    return { error: "You don't have permission to edit documents." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const docType = parseDocumentType(String(formData.get("doc_type") ?? "other"));
  const replacement = formData.get("file");
  const newFile =
    replacement instanceof File && replacement.size > 0 ? replacement : null;

  if (!title) return { error: "Title is required." };

  const admin = createAdminClient();

  if (documentId.startsWith("expense:")) {
    const expenseId = documentId.slice("expense:".length);
    const { data: expense } = await admin
      .from("property_expenses")
      .select("id, attachment_url, unit_id, site_id")
      .eq("id", expenseId)
      .eq("organization_id", ctx.org.id)
      .maybeSingle();

    if (!expense) return { error: "Document not found." };

    let attachmentUrl = expense.attachment_url as string | null;
    if (newFile) {
      const uploaded = await uploadReplacementFile(
        admin,
        ctx.org.id,
        expense.unit_id,
        expense.site_id,
        newFile
      );
      if (uploaded.error || !uploaded.path) {
        return { error: uploaded.error ?? "Could not upload file." };
      }
      if (attachmentUrl) {
        await admin.storage.from("documents").remove([attachmentUrl]);
        await admin
          .from("management_documents")
          .delete()
          .eq("organization_id", ctx.org.id)
          .eq("file_url", attachmentUrl);
      }
      attachmentUrl = uploaded.path;

      await admin.from("management_documents").insert({
        organization_id: ctx.org.id,
        site_id: expense.site_id,
        unit_id: expense.unit_id,
        lease_id: null,
        doc_type: docType,
        title,
        file_url: attachmentUrl,
        issued_by: ctx.user.id,
      });
    }

    const { error } = await admin
      .from("property_expenses")
      .update({
        description: title,
        category: docTypeToExpenseCategory(docType),
        attachment_url: attachmentUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId);

    if (error) return { error: error.message };

    if (!newFile && attachmentUrl) {
      await admin
        .from("management_documents")
        .update({ title, doc_type: docType })
        .eq("organization_id", ctx.org.id)
        .eq("file_url", attachmentUrl);
    }

    revalidateDocumentPaths(orgSlug);
    revalidatePath(`/d/${orgSlug}/expenses`);
    return { success: true };
  }

  const { data: doc } = await admin
    .from("management_documents")
    .select("id, file_url, unit_id, site_id, lease_id")
    .eq("id", documentId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!doc) return { error: "Document not found." };

  let fileUrl = doc.file_url as string;
  if (newFile) {
    const uploaded = await uploadReplacementFile(
      admin,
      ctx.org.id,
      doc.unit_id,
      doc.site_id,
      newFile
    );
    if (uploaded.error || !uploaded.path) {
      return { error: uploaded.error ?? "Could not upload file." };
    }
    await admin.storage.from("documents").remove([fileUrl]);
    await admin
      .from("property_expenses")
      .update({ attachment_url: uploaded.path })
      .eq("organization_id", ctx.org.id)
      .eq("attachment_url", fileUrl);
    fileUrl = uploaded.path;
  }

  const { error } = await admin
    .from("management_documents")
    .update({
      title,
      doc_type: docType,
      file_url: fileUrl,
    })
    .eq("id", documentId);

  if (error) {
    if (error.message.includes("invalid input value for enum")) {
      return {
        error:
          "Document category not supported yet. Run the latest database migration, then try again.",
      };
    }
    return { error: error.message };
  }

  revalidateDocumentPaths(orgSlug);
  if (doc.lease_id) revalidatePath(`/d/${orgSlug}/tenants/${doc.lease_id}`);
  return { success: true };
}

export async function deleteDocument(
  orgSlug: string,
  documentId: string
): Promise<DocumentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role)) {
    return { error: "You don't have permission to delete documents." };
  }

  const admin = createAdminClient();

  if (documentId.startsWith("expense:")) {
    const expenseId = documentId.slice("expense:".length);
    const { data: expense } = await admin
      .from("property_expenses")
      .select("id, attachment_url")
      .eq("id", expenseId)
      .eq("organization_id", ctx.org.id)
      .maybeSingle();

    if (!expense) return { error: "Document not found." };

    const filePath = expense.attachment_url as string | null;
    if (filePath) {
      await admin
        .from("management_documents")
        .delete()
        .eq("organization_id", ctx.org.id)
        .eq("file_url", filePath);
      await admin.storage.from("documents").remove([filePath]);
    }

    const { error } = await admin
      .from("property_expenses")
      .update({
        attachment_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId);

    if (error) return { error: error.message };

    revalidateDocumentPaths(orgSlug);
    revalidatePath(`/d/${orgSlug}/expenses`);
    return { success: true };
  }

  const { data: doc } = await admin
    .from("management_documents")
    .select("id, file_url, lease_id")
    .eq("id", documentId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!doc) return { error: "Document not found." };

  const filePath = doc.file_url as string;

  const { error } = await admin
    .from("management_documents")
    .delete()
    .eq("id", documentId);

  if (error) return { error: error.message };

  await admin
    .from("property_expenses")
    .update({ attachment_url: null, updated_at: new Date().toISOString() })
    .eq("organization_id", ctx.org.id)
    .eq("attachment_url", filePath);

  if (filePath) {
    await admin.storage.from("documents").remove([filePath]);
  }

  revalidateDocumentPaths(orgSlug);
  if (doc.lease_id) revalidatePath(`/d/${orgSlug}/tenants/${doc.lease_id}`);
  return { success: true };
}
