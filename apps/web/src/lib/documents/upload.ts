import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentType } from "@/lib/data/documents";
import { parseDocumentType } from "@/lib/documents/categories";

export function inferContentType(file: File, ext: string): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;

  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
  };

  return byExt[ext] ?? "application/octet-stream";
}

export function collectFilesFromFormData(
  formData: FormData,
  fieldName = "documents"
): File[] {
  const files = formData
    .getAll(fieldName)
    .filter((item): item is File => item instanceof File && item.size > 0);
  const single = formData.get("file");
  if (single instanceof File && single.size > 0) {
    return [...files, single];
  }
  return files;
}

export function readDocumentUploadFromFormData(formData: FormData): {
  files: File[];
  docType: DocumentType;
  title: string;
} {
  const files = collectFilesFromFormData(formData);
  const docType = parseDocumentType(String(formData.get("doc_type") ?? "other"));
  const title = String(formData.get("title") ?? "").trim();
  return { files, docType, title };
}

type InsertDocumentsInput = {
  admin: SupabaseClient;
  orgId: string;
  userId: string;
  files: File[];
  docType: DocumentType;
  title?: string;
  unitId?: string | null;
  leaseId?: string | null;
  siteId?: string | null;
  folderId?: string | null;
};

export async function insertManagementDocuments({
  admin,
  orgId,
  userId,
  files,
  docType,
  title,
  unitId = null,
  leaseId = null,
  siteId = null,
  folderId = null,
}: InsertDocumentsInput): Promise<{ error?: string; count: number }> {
  if (files.length === 0) return { count: 0 };

  let uploaded = 0;

  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) {
      return { error: "Each file must be 20MB or less.", count: uploaded };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const contentType = inferContentType(file, ext);
    const path = `${orgId}/${unitId ?? siteId ?? "plaza"}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(path, file, { upsert: false, contentType });

    if (uploadError) return { error: uploadError.message, count: uploaded };

    const docTitle = title || file.name.replace(/\.[^.]+$/, "");

    const { error: insertError } = await admin.from("management_documents").insert({
      organization_id: orgId,
      site_id: siteId,
      unit_id: unitId,
      lease_id: leaseId,
      folder_id: folderId,
      doc_type: docType,
      title: files.length > 1 && title ? `${docTitle} (${file.name})` : docTitle,
      file_url: path,
      issued_by: userId,
    });

    if (insertError) {
      await admin.storage.from("documents").remove([path]);
      if (insertError.message.includes("invalid input value for enum")) {
        return {
          error:
            "Document category not supported yet. Run the latest database migration, then try again.",
          count: uploaded,
        };
      }
      return { error: insertError.message, count: uploaded };
    }

    uploaded += 1;
  }

  return { count: uploaded };
}

export async function uploadDocumentsFromFormData(
  admin: SupabaseClient,
  orgId: string,
  userId: string,
  formData: FormData,
  context: {
    unitId?: string | null;
    leaseId?: string | null;
    siteId?: string | null;
  }
): Promise<{ error?: string; count: number }> {
  const { files, docType, title } = readDocumentUploadFromFormData(formData);
  if (files.length === 0) return { count: 0 };

  return insertManagementDocuments({
    admin,
    orgId,
    userId,
    files,
    docType,
    title: title || undefined,
    unitId: context.unitId ?? null,
    leaseId: context.leaseId ?? null,
    siteId: context.siteId ?? null,
  });
}
