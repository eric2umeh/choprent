import { createAdminClient } from "@/lib/supabase/admin";
import { isR2Configured, r2GetObjectSize } from "@/lib/storage/r2";

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
  const meta = metadata as { size?: unknown; contentLength?: unknown };
  const size = Number(meta.size ?? meta.contentLength);
  return Number.isFinite(size) && size >= 0 ? size : null;
}

function splitPath(path: string): { folder: string; name: string } | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  const slash = trimmed.lastIndexOf("/");
  if (slash < 0) return { folder: "", name: trimmed };
  return {
    folder: trimmed.slice(0, slash),
    name: trimmed.slice(slash + 1),
  };
}

/**
 * Look up object sizes via the Storage list API (PostgREST does not expose
 * the `storage` schema on this project). Falls back to R2 HEAD for missing keys.
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

  const byFolder = new Map<string, string[]>();
  for (const path of unique) {
    const parts = splitPath(path);
    if (!parts) continue;
    const list = byFolder.get(parts.folder) ?? [];
    list.push(path);
    byFolder.set(parts.folder, list);
  }

  try {
    const admin = createAdminClient();
    await Promise.all(
      [...byFolder.entries()].map(async ([folder, folderPaths]) => {
        const wanted = new Set(
          folderPaths.map((p) => splitPath(p)?.name).filter(Boolean) as string[]
        );
        let offset = 0;
        const pageSize = 100;

        while (wanted.size > 0) {
          const { data, error } = await admin.storage.from(bucket).list(folder, {
            limit: pageSize,
            offset,
          });
          if (error || !data?.length) break;

          for (const row of data) {
            if (!wanted.has(row.name)) continue;
            const size = sizeFromMetadata(row.metadata);
            if (size == null) continue;
            const fullPath = folder ? `${folder}/${row.name}` : row.name;
            result.set(fullPath, size);
            wanted.delete(row.name);
          }

          if (data.length < pageSize) break;
          offset += pageSize;
        }
      })
    );
  } catch {
    // Size is best-effort — lists still render without it.
  }

  // New uploads live in R2 — fill gaps for paths not found in Supabase.
  if (isR2Configured()) {
    const missing = unique.filter((path) => !result.has(path));
    const concurrency = 8;
    for (let i = 0; i < missing.length; i += concurrency) {
      const chunk = missing.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (path) => {
          const size = await r2GetObjectSize(bucket, path);
          if (size != null) result.set(path, size);
        })
      );
    }
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
