import { describe, expect, it } from "vitest";

import { assertPrivateOriginalKey } from "./r2";

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
