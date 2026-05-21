import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getRequiredEnv } from "./env";
import type { AllowedImageType } from "./photos";

let client: S3Client | null = null;

export function getR2Client() {
  if (!client) {
    const accountId = getRequiredEnv("R2_ACCOUNT_ID");
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY")
      }
    });
  }

  return client;
}

export async function createOriginalUploadUrl({
  storageKey,
  contentType,
  size
}: {
  storageKey: string;
  contentType: AllowedImageType;
  size: number;
}) {
  const command = new PutObjectCommand({
    Bucket: getRequiredEnv("R2_BUCKET_PRIVATE"),
    Key: storageKey,
    ContentType: contentType,
    ContentLength: size
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: 600 });
}

export function assertPrivateOriginalKey(storageKey: string) {
  if (!storageKey.startsWith("private/originals/")) {
    throw new Error("Invalid private original key.");
  }

  return storageKey;
}

export async function createOriginalDownloadUrl(storageKey: string) {
  const command = new GetObjectCommand({
    Bucket: getRequiredEnv("R2_BUCKET_PRIVATE"),
    Key: assertPrivateOriginalKey(storageKey)
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: 600 });
}

export async function readPrivateObject(storageKey: string) {
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getRequiredEnv("R2_BUCKET_PRIVATE"),
      Key: assertPrivateOriginalKey(storageKey)
    })
  );

  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error("Original image could not be read.");
  }

  return Buffer.from(bytes);
}

export async function writePublicObject({
  storageKey,
  body,
  contentType = "image/webp"
}: {
  storageKey: string;
  body: Buffer;
  contentType?: string;
}) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getRequiredEnv("R2_BUCKET_PUBLIC"),
      Key: storageKey,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );
}
