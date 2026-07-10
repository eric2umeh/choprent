import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createSignedStorageUrl(
  bucket: "receipts" | "documents",
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data: adminData } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (adminData?.signedUrl) return adminData.signedUrl;
  } catch {
    // fall through to user client
  }

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  return data?.signedUrl ?? null;
}
