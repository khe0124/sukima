import { z } from "zod";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export type UploadUrlRequest = {
  filename: string;
  contentType: AllowedImageType;
  size: number;
};

const uploadUrlRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_IMAGE_TYPES, {
    errorMap: () => ({ message: "Unsupported image type." })
  }),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, "Image must be 10MB or smaller.")
});

const extensionByContentType: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif"
};

export function parseUploadUrlRequest(input: unknown): UploadUrlRequest {
  return uploadUrlRequestSchema.parse(input);
}

export function buildOriginalStorageKey({
  photoId,
  contentType,
  now = new Date()
}: {
  photoId: string;
  contentType: AllowedImageType;
  now?: Date;
}) {
  const year = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric"
  }).format(now);
  const month = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    month: "2-digit"
  }).format(now);
  const day = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    day: "2-digit"
  }).format(now);
  const extension = extensionByContentType[contentType];

  return `private/originals/${year}/${month}/${day}/${photoId}-original.${extension}`;
}

export function normalizePhotoListLimit(value: string | null) {
  if (!value) return 30;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 30;

  return Math.min(parsed, 100);
}

export function normalizePhotoListPage(value: string | null) {
  if (!value) return 1;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;

  return parsed;
}

export function toPublicPhotoUrl(storageKey: string | null) {
  if (!storageKey) return null;

  const baseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!baseUrl) return null;

  return `${baseUrl.replace(/\/$/, "")}/${storageKey.replace(/^\/+/, "")}`;
}
