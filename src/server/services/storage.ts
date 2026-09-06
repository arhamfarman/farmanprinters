import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as presignS3 } from "@aws-sdk/s3-request-presigner";

/**
 * Single storage seam so the rest of the app (asset-actions.ts, the
 * inquiry attachment upload) never branches on STORAGE_DRIVER itself — it
 * just calls uploadAsset/getSignedDownloadUrl/deleteAsset. Two drivers:
 * a plain S3 bucket (for presses that outgrow the free Supabase tier or
 * self-host), and Supabase Storage's own REST API (its bucket protocol
 * isn't plain S3, so it gets its own fetch-based implementation rather than
 * forcing it through the S3 SDK with the wrong wire format).
 */
interface StorageDriver {
  upload(key: string, body: Buffer, contentType: string): Promise<void>;
  signedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  remove(key: string): Promise<void>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function s3Driver(): StorageDriver {
  const client = new S3Client({ region: requireEnv("AWS_REGION") });
  const bucket = requireEnv("AWS_S3_BUCKET");
  return {
    async upload(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async signedDownloadUrl(key, expiresInSeconds) {
      return presignS3(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSeconds });
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

function supabaseDriver(): StorageDriver {
  const projectUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = requireEnv("SUPABASE_STORAGE_BUCKET");
  const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };

  return {
    async upload(key, body, contentType) {
      const res = await fetch(`${projectUrl}/storage/v1/object/${bucket}/${key}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" },
        // fetch's BodyInit doesn't list Node's Buffer, just its underlying
        // Uint8Array — a no-op at runtime, just satisfies tsc.
        body: new Uint8Array(body),
      });
      if (!res.ok) throw new Error(`Supabase upload failed (${res.status}): ${await res.text()}`);
    },
    async signedDownloadUrl(key, expiresInSeconds) {
      const res = await fetch(`${projectUrl}/storage/v1/object/sign/${bucket}/${key}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      });
      if (!res.ok) throw new Error(`Supabase sign failed (${res.status}): ${await res.text()}`);
      const { signedURL } = (await res.json()) as { signedURL: string };
      return `${projectUrl}/storage/v1${signedURL}`;
    },
    async remove(key) {
      const res = await fetch(`${projectUrl}/storage/v1/object/${bucket}/${key}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`Supabase delete failed (${res.status}): ${await res.text()}`);
    },
  };
}

function driver(): StorageDriver {
  return (process.env.STORAGE_DRIVER ?? "s3") === "supabase" ? supabaseDriver() : s3Driver();
}

/** Object key layout: one prefix per press so a single bucket can serve every tenant. */
export function assetStorageKey(pressId: string, orderId: string | null, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const scope = orderId ?? "unfiled";
  return `${pressId}/${scope}/${Date.now()}-${safeName}`;
}

export async function uploadAsset(storageKey: string, body: Buffer, contentType: string): Promise<void> {
  await driver().upload(storageKey, body, contentType);
}

/**
 * Time-limited download link — this is the enforcement point for
 * SharedAsset's expiry/permission (see schema.prisma): a revoked or
 * expired share must never reach here, so callers (asset-actions.ts) check
 * that before calling, not after.
 */
export async function getSignedDownloadUrl(storageKey: string, expiresInSeconds = 300): Promise<string> {
  return driver().signedDownloadUrl(storageKey, expiresInSeconds);
}

export async function deleteAsset(storageKey: string): Promise<void> {
  await driver().remove(storageKey);
}
