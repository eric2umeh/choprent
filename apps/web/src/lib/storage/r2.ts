import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type LogicalBucket = "documents" | "receipts";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  documentsBucket: string;
  receiptsBucket: string;
};

function readR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const endpoint =
    process.env.R2_S3_ENDPOINT?.trim() ||
    (accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : "");
  const documentsBucket =
    process.env.R2_DOCUMENTS_BUCKET?.trim() || "choprent-documents";
  const receiptsBucket =
    process.env.R2_RECEIPTS_BUCKET?.trim() || "choprent-receipts";

  if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    endpoint,
    documentsBucket,
    receiptsBucket,
  };
}

let cachedClient: S3Client | null | undefined;
let cachedConfig: R2Config | null | undefined;

export function isR2Configured(): boolean {
  return readR2Config() !== null;
}

function getR2(): { client: S3Client; config: R2Config } | null {
  if (cachedClient !== undefined) {
    return cachedClient && cachedConfig
      ? { client: cachedClient, config: cachedConfig }
      : null;
  }

  const config = readR2Config();
  if (!config) {
    cachedClient = null;
    cachedConfig = null;
    return null;
  }

  cachedConfig = config;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client: cachedClient, config };
}

export function r2BucketName(logical: LogicalBucket): string | null {
  const r2 = getR2();
  if (!r2) return null;
  return logical === "receipts"
    ? r2.config.receiptsBucket
    : r2.config.documentsBucket;
}

export async function r2UploadObject(input: {
  bucket: LogicalBucket;
  path: string;
  body: Buffer | Uint8Array | Blob | string;
  contentType: string;
}): Promise<{ error?: string }> {
  const r2 = getR2();
  const bucket = r2BucketName(input.bucket);
  if (!r2 || !bucket) {
    return { error: "Cloudflare R2 is not configured." };
  }

  try {
    const body =
      input.body instanceof Blob
        ? Buffer.from(await input.body.arrayBuffer())
        : input.body;

    await r2.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.path,
        Body: body,
        ContentType: input.contentType,
      })
    );
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "R2 upload failed.",
    };
  }
}

export async function r2DeleteObjects(
  bucket: LogicalBucket,
  paths: string[]
): Promise<void> {
  const r2 = getR2();
  const bucketName = r2BucketName(bucket);
  const keys = [...new Set(paths.map((p) => p.trim()).filter(Boolean))];
  if (!r2 || !bucketName || keys.length === 0) return;

  try {
    await r2.client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  } catch {
    // Best-effort — caller may also try Supabase for legacy objects.
  }
}

export async function r2CreateSignedUrl(
  bucket: LogicalBucket,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const r2 = getR2();
  const bucketName = r2BucketName(bucket);
  if (!r2 || !bucketName || !path.trim()) return null;

  try {
    // Confirm the object exists before minting a URL.
    await r2.client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: path,
      })
    );

    return await getSignedUrl(
      r2.client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: path,
      }),
      { expiresIn }
    );
  } catch {
    return null;
  }
}

export async function r2GetObjectSize(
  bucket: LogicalBucket,
  path: string
): Promise<number | null> {
  const r2 = getR2();
  const bucketName = r2BucketName(bucket);
  if (!r2 || !bucketName || !path.trim()) return null;

  try {
    const result = await r2.client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: path,
      })
    );
    const size = Number(result.ContentLength);
    return Number.isFinite(size) && size >= 0 ? size : null;
  } catch {
    return null;
  }
}
