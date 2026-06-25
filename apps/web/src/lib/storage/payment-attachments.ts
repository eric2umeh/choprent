import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadPaymentAttachments(
  paymentId: string,
  orgId: string,
  unitId: string,
  files: File[],
  uploadedBy: string
): Promise<{ error?: string }> {
  if (files.length === 0) return {};

  const admin = createAdminClient();
  const paths: string[] = [];

  for (const file of files) {
    if (file.size === 0) continue;
    if (file.size > MAX_BYTES) {
      return { error: `${file.name} exceeds 10MB.` };
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return { error: `${file.name}: use JPG, PNG, WebP, or PDF.` };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${orgId}/${unitId}/${paymentId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("receipts")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      if (paths.length) await admin.storage.from("receipts").remove(paths);
      return { error: uploadError.message };
    }

    paths.push(path);

    const { error: insertError } = await admin.from("payment_attachments").insert({
      payment_id: paymentId,
      file_url: path,
      file_name: file.name,
      uploaded_by: uploadedBy,
    });

    if (insertError) {
      await admin.storage.from("receipts").remove(paths);
      return { error: insertError.message };
    }
  }

  return {};
}
