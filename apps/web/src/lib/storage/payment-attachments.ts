import { createAdminClient } from "@/lib/supabase/admin";
import { deleteObjects, uploadObject } from "@/lib/storage/object-store";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024;

function isMissingAttachmentsTable(message: string): boolean {
  return /schema cache|could not find.*payment_attachments|relation.*payment_attachments/i.test(
    message
  );
}

export type UploadPaymentAttachmentsResult = {
  paths: string[];
  error?: string;
  /** False when DB table is missing — files still land in storage. */
  attachmentsInDb: boolean;
};

export async function uploadPaymentAttachments(
  paymentId: string,
  orgId: string,
  unitId: string,
  files: File[],
  uploadedBy: string
): Promise<UploadPaymentAttachmentsResult> {
  if (files.length === 0) return { paths: [], attachmentsInDb: true };

  const admin = createAdminClient();
  const paths: string[] = [];
  let attachmentsInDb = true;

  for (const file of files) {
    if (file.size === 0) continue;
    if (file.size > MAX_BYTES) {
      return {
        paths,
        error: `${file.name} exceeds 10MB.`,
        attachmentsInDb,
      };
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return {
        paths,
        error: `${file.name}: use JPG, PNG, WebP, or PDF.`,
        attachmentsInDb,
      };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${orgId}/${unitId}/${paymentId}/${crypto.randomUUID()}.${ext}`;

    const uploaded = await uploadObject({
      bucket: "receipts",
      path,
      body: file,
      contentType: file.type,
    });

    if (uploaded.error) {
      if (paths.length) await deleteObjects("receipts", paths);
      return { paths: [], error: uploaded.error, attachmentsInDb };
    }

    paths.push(path);

    if (!attachmentsInDb) continue;

    const { error: insertError } = await admin.from("payment_attachments").insert({
      payment_id: paymentId,
      file_url: path,
      file_name: file.name,
      uploaded_by: uploadedBy,
    });

    if (insertError) {
      if (isMissingAttachmentsTable(insertError.message)) {
        attachmentsInDb = false;
        continue;
      }
      await deleteObjects("receipts", paths);
      return { paths: [], error: insertError.message, attachmentsInDb: true };
    }
  }

  return { paths, attachmentsInDb };
}
