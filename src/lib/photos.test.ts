import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  buildOriginalStorageKey,
  normalizePhotoListLimit,
  normalizePhotoListPage,
  parseUploadUrlRequest,
  toPublicPhotoUrl
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

describe("normalizePhotoListPage", () => {
  it("defaults to page 1 for missing, zero, negative, or non-numeric input", () => {
    expect(normalizePhotoListPage(null)).toBe(1);
    expect(normalizePhotoListPage("")).toBe(1);
    expect(normalizePhotoListPage("0")).toBe(1);
    expect(normalizePhotoListPage("-3")).toBe(1);
    expect(normalizePhotoListPage("abc")).toBe(1);
  });

  it("parses a valid 1-indexed page number", () => {
    expect(normalizePhotoListPage("1")).toBe(1);
    expect(normalizePhotoListPage("7")).toBe(7);
  });
});

describe("toPublicPhotoUrl", () => {
  it("keeps the full public object key in generated URLs", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://pub.example.com";

    expect(
      toPublicPhotoUrl("public/photos/2026/05/26/photo-id-thumb.webp")
    ).toBe("https://pub.example.com/public/photos/2026/05/26/photo-id-thumb.webp");

    delete process.env.R2_PUBLIC_BASE_URL;
  });
});
