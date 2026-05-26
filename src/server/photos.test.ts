import { describe, expect, it } from "vitest";

import { parseCreatePhotoRequest, parseUpdatePhotoRequest } from "./photos";

describe("parseCreatePhotoRequest", () => {
  it("keeps uploaded photo tags as a clean unique list", () => {
    expect(
      parseCreatePhotoRequest({
        photoId: "550e8400-e29b-41d4-a716-446655440000",
        storageKeyOriginal: "private/originals/2026/05/26/550e8400-e29b-41d4-a716-446655440000-original.png",
        tags: ["street", " street ", "night"],
        visibility: "public"
      }).tags
    ).toEqual(["street", "night"]);
  });
});

describe("parseUpdatePhotoRequest", () => {
  it("accepts metadata updates with tag arrays", () => {
    expect(
      parseUpdatePhotoRequest({
        title: "Rain Walk",
        description: "A rainy evening.",
        takenAt: "2026-05-19T12:00:00+09:00",
        tags: ["street", "night"],
        visibility: "public"
      })
    ).toEqual({
      title: "Rain Walk",
      description: "A rainy evening.",
      takenAt: "2026-05-19T12:00:00+09:00",
      tags: ["street", "night"],
      visibility: "public"
    });
  });

  it("rejects unsupported visibility values", () => {
    expect(() =>
      parseUpdatePhotoRequest({
        visibility: "everyone"
      })
    ).toThrow();
  });

  it("limits tag count", () => {
    expect(() =>
      parseUpdatePhotoRequest({
        tags: Array.from({ length: 21 }, (_, index) => `tag-${index}`)
      })
    ).toThrow();
  });
});
