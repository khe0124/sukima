import { afterEach, describe, expect, it, vi } from "vitest";

import { assertPrivateOriginalKey, createOriginalUploadUrl } from "./r2";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assertPrivateOriginalKey", () => {
  it("accepts private original keys", () => {
    expect(
      assertPrivateOriginalKey("private/originals/2026/05/19/photo-id-original.jpg")
    ).toBe("private/originals/2026/05/19/photo-id-original.jpg");
  });

  it("rejects public keys", () => {
    expect(() => assertPrivateOriginalKey("public/photos/2026/05/19/photo-large.webp")).toThrow(
      "Invalid private original key."
    );
  });
});

describe("createOriginalUploadUrl", () => {
  it("does not sign browser-controlled content length or checksum query params", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "account-id");
    vi.stubEnv("R2_ACCESS_KEY_ID", "access-key-id");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret-access-key");
    vi.stubEnv("R2_BUCKET_PRIVATE", "private-bucket");

    const uploadUrl = await createOriginalUploadUrl({
      storageKey: "private/originals/2026/05/21/photo-original.png",
      contentType: "image/png"
    });
    const params = new URL(uploadUrl).searchParams;

    expect(params.get("X-Amz-SignedHeaders")).toBe("host");
    expect(params.has("x-amz-checksum-crc32")).toBe(false);
    expect(params.has("x-amz-sdk-checksum-algorithm")).toBe(false);
  });
});
