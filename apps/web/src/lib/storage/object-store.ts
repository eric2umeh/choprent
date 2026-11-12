import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isR2Configured,
  r2CreateSignedUrl,
  r2DeleteObjects,
  r2GetObjectSize,
  r2UploadObject,
  type LogicalBucket,
} from "@/lib/storage/r2";

export type { LogicalBucket };

/**
 * Upload a file. Prefers Cloudflare R2 when configured; otherwise Supabase Storage.
 * DB rows should keep storing the returned `path` (object key), never a public URL.
 */
export async function uploadObject(input: {
  bucket: LogicalBucket;
  path: string;
  body: Buffer | Uint8Array | Blob | File;
  contentType: string;
  /** Supabase-only: overwrite existing key. R2 PutObject always overwrites. */
  upsert?: boolean;
}): Promise<{ path: string; error?: string }> {
  if (isR2Configured()) {
    const result = await r2UploadObject({
      bucket: input.bucket,
      path: input.path,
      body: input.body,
      contentType: input.contentType,
    });
    if (result.error) return { path: input.path, error: result.error };
    return { path: input.path };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(input.bucket)
      .upload(input.path, input.body, {
        upsert: input.upsert ?? false,
        contentType: input.contentType,
      });
    if (error) return { path: input.path, error: error.message };
    return { path: input.path };
  } catch (err) {
    return {
      path: input.path,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

/**
 * Short-lived download URL. Tries R2 first (for new uploads), then Supabase
 * (for files that still live in the old buckets).
 */
export async function createSignedObjectUrl(
  bucket: LogicalBucket,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!path?.trim()) return null;

  if (isR2Configured()) {
    const r2Url = await r2CreateSignedUrl(bucket, path, expiresIn);
    if (r2Url) return r2Url;
  }

  try {
    const admin = createAdminClient();
    const { data: adminData } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (adminData?.signedUrl) return adminData.signedUrl;
  } catch {
    // fall through
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/** Delete from R2 and Supabase so legacy + new keys are both cleared. */
export async function deleteObjects(
  bucket: LogicalBucket,
  paths: string[]
): Promise<void> {
  const unique = [...new Set(paths.map((p) => p.trim()).filter(Boolean))];
  if (!unique.length) return;

  if (isR2Configured()) {
    await r2DeleteObjects(bucket, unique);
  }

  try {
    const admin = createAdminClient();
    await admin.storage.from(bucket).remove(unique);
  } catch {
    // ignore — object may only exist in R2
  }
}

export async function getObjectSize(
  bucket: LogicalBucket,
  path: string
): Promise<number | null> {
  if (!path?.trim()) return null;

  if (isR2Configured()) {
    const r2Size = await r2GetObjectSize(bucket, path);
    if (r2Size != null) return r2Size;
  }

  try {
    const admin = createAdminClient();
    const slash = path.lastIndexOf("/");
    const folder = slash >= 0 ? path.slice(0, slash) : "";
    const name = slash >= 0 ? path.slice(slash + 1) : path;
    const { data, error } = await admin.storage.from(bucket).list(folder, {
      limit: 100,
      search: name,
    });
    if (error || !data?.length) return null;
    const row = data.find((item) => item.name === name);
    const meta = row?.metadata as { size?: unknown; contentLength?: unknown } | null;
    const size = Number(meta?.size ?? meta?.contentLength);
    return Number.isFinite(size) && size >= 0 ? size : null;
  } catch {
    return null;
  }
}
