import { describe, expect, it } from "vitest";

import { buildProcessedStorageKeys, getResizePlan } from "./image-processing";

describe("buildProcessedStorageKeys", () => {
  it("creates public webp keys beside the original date path", () => {
    expect(
      buildProcessedStorageKeys(
        "private/originals/2026/05/19/550e8400-e29b-41d4-a716-446655440000-original.jpg"
      )
    ).toEqual({
      large: "public/photos/2026/05/19/550e8400-e29b-41d4-a716-446655440000-large.webp",
      medium: "public/photos/2026/05/19/550e8400-e29b-41d4-a716-446655440000-medium.webp",
      thumbnail: "public/photos/2026/05/19/550e8400-e29b-41d4-a716-446655440000-thumb.webp",
      blur: "public/photos/2026/05/19/550e8400-e29b-41d4-a716-446655440000-blur.webp"
    });
  });
});

describe("getResizePlan", () => {
  it("defines the expected web display variants", () => {
    expect(getResizePlan()).toEqual([
      { name: "large", width: 1920, quality: 82 },
      { name: "medium", width: 1200, quality: 80 },
      { name: "thumbnail", width: 400, quality: 76 },
      { name: "blur", width: 20, quality: 45 }
    ]);
  });
});
