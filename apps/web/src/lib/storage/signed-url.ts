import {
  createSignedObjectUrl,
  type LogicalBucket,
} from "@/lib/storage/object-store";

/** @deprecated Prefer createSignedObjectUrl — kept for existing call sites. */
export async function createSignedStorageUrl(
  bucket: LogicalBucket,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  return createSignedObjectUrl(bucket, path, expiresIn);
}
