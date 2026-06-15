import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createSignedStorageUrl(
  bucket: "receipts" | "documents",
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (data?.signedUrl) return data.signedUrl;

  try {
    const admin = createAdminClient();
    const { data: adminData } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    return adminData?.signedUrl ?? null;
  } catch {
    if (error) return null;
    return null;
  }
}
