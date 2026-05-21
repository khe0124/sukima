import { describe, expect, it } from "vitest";

import { parseUpdatePhotoRequest } from "./photos";

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
