import { describe, expect, it } from "vitest";

import { buildPublicCollectionWhere, parseCollectionRequest, parseCollectionPhotosRequest } from "./collections";

describe("parseCollectionRequest", () => {
  it("accepts collection metadata", () => {
    expect(
      parseCollectionRequest({
        title: "Seoul Walk",
        description: "Night walk photos.",
        visibility: "public",
        coverPhotoId: "550e8400-e29b-41d4-a716-446655440000"
      })
    ).toEqual({
      title: "Seoul Walk",
      description: "Night walk photos.",
      visibility: "public",
      coverPhotoId: "550e8400-e29b-41d4-a716-446655440000"
    });
  });

  it("rejects unsupported visibility values", () => {
    expect(() =>
      parseCollectionRequest({
        title: "Seoul Walk",
        visibility: "everyone"
      })
    ).toThrow();
  });
});

describe("parseCollectionPhotosRequest", () => {
  it("accepts ordered photo IDs", () => {
    expect(
      parseCollectionPhotosRequest({
        photoIds: [
          "550e8400-e29b-41d4-a716-446655440000",
          "550e8400-e29b-41d4-a716-446655440001"
        ]
      })
    ).toEqual({
      photoIds: [
        "550e8400-e29b-41d4-a716-446655440000",
        "550e8400-e29b-41d4-a716-446655440001"
      ]
    });
  });
});

describe("buildPublicCollectionWhere", () => {
  it("only exposes public collections", () => {
    expect(buildPublicCollectionWhere()).toBe("c.visibility = 'public'");
  });
});
