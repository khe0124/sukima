import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  buildOriginalStorageKey,
  normalizePhotoListLimit,
  parseUploadUrlRequest
} from "./photos";

describe("parseUploadUrlRequest", () => {
  it("accepts supported image upload metadata", () => {
    const result = parseUploadUrlRequest({
      filename: "IMG_1234.JPG",
      contentType: "image/jpeg",
      size: 482938
    });

    expect(result).toEqual({
      filename: "IMG_1234.JPG",
      contentType: "image/jpeg",
      size: 482938
    });
  });

  it("rejects files over the upload limit", () => {
    expect(() =>
      parseUploadUrlRequest({
        filename: "large.jpg",
        contentType: "image/jpeg",
        size: MAX_UPLOAD_BYTES + 1
      })
    ).toThrow("Image must be 10MB or smaller.");
  });

  it("rejects non-image content types", () => {
    expect(() =>
      parseUploadUrlRequest({
        filename: "notes.txt",
        contentType: "text/plain",
        size: 1024
      })
    ).toThrow("Unsupported image type.");
  });
});

describe("buildOriginalStorageKey", () => {
  it("creates private date-partitioned storage keys without using the original filename", () => {
    const key = buildOriginalStorageKey({
      photoId: "550e8400-e29b-41d4-a716-446655440000",
      contentType: "image/jpeg",
      now: new Date("2026-05-18T20:13:00+09:00")
    });

    expect(key).toBe(
      "private/originals/2026/05/18/550e8400-e29b-41d4-a716-446655440000-original.jpg"
    );
  });
});

describe("normalizePhotoListLimit", () => {
  it("defaults to 30 and caps at 100", () => {
    expect(normalizePhotoListLimit(null)).toBe(30);
    expect(normalizePhotoListLimit("200")).toBe(100);
    expect(normalizePhotoListLimit("12")).toBe(12);
  });
});
