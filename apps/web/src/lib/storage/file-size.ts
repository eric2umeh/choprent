import { createAdminClient } from "@/lib/supabase/admin";

export type StorageBucket = "receipts" | "documents";

/** Human-readable size for tables (e.g. 240 KB, 1.2 MB). */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function sizeFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const size = Number((metadata as { size?: unknown }).size);
  return Number.isFinite(size) && size >= 0 ? size : null;
}

/**
 * Look up object sizes from `storage.objects` for the given bucket paths.
 * Returns a map keyed by storage path.
 */
export async function getStorageObjectSizes(
  bucket: StorageBucket,
  paths: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const unique = [
    ...new Set(paths.map((p) => p.trim()).filter((p) => p.length > 0)),
  ];
  if (!unique.length) return result;

  try {
    const admin = createAdminClient();
    const chunkSize = 100;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const { data, error } = await admin
        .schema("storage")
        .from("objects")
        .select("name, metadata")
        .eq("bucket_id", bucket)
        .in("name", chunk);

      if (error || !data) continue;
      for (const row of data) {
        const size = sizeFromMetadata(row.metadata);
        if (size != null && typeof row.name === "string") {
          result.set(row.name, size);
        }
      }
    }
  } catch {
    // Size is best-effort — lists still render without it.
  }

  return result;
}

export async function getStorageObjectSizesForEntries(
  entries: Array<{ bucket: StorageBucket; path: string }>
): Promise<Map<string, number>> {
  const byBucket = new Map<StorageBucket, string[]>();
  for (const entry of entries) {
    const path = entry.path.trim();
    if (!path) continue;
    const list = byBucket.get(entry.bucket) ?? [];
    list.push(path);
    byBucket.set(entry.bucket, list);
  }

  const result = new Map<string, number>();
  for (const [bucket, paths] of byBucket) {
    const sizes = await getStorageObjectSizes(bucket, paths);
    for (const [path, size] of sizes) {
      result.set(`${bucket}:${path}`, size);
      result.set(path, size);
    }
  }
  return result;
}
