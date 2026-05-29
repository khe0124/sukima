import { describe, expect, it } from "vitest";

import {
  buildAdminCollectionsQuery,
  buildPublicCollectionBySlugQuery,
  buildPublicCollectionsQuery,
  buildPublicCollectionWhere,
  parseCollectionRequest,
  parseCollectionPhotosRequest
} from "./collections";

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

describe("buildAdminCollectionsQuery", () => {
  it("groups selected cover image columns for PostgreSQL", () => {
    expect(buildAdminCollectionsQuery()).toContain(
      "GROUP BY c.id, cover.storage_key_thumbnail, cover.storage_key_medium"
    );
  });
});

describe("public collection queries", () => {
  it("counts only public ready photos in public collection lists", () => {
    const publicPhotoJoin = "public_photos.visibility = 'public' AND public_photos.status = 'ready'";

    expect(buildPublicCollectionsQuery()).toContain(publicPhotoJoin);
    expect(buildPublicCollectionsQuery()).toContain("COUNT(public_photos.id) AS photo_count");
  });

  it("counts only public ready photos in public collection details", () => {
    const publicPhotoJoin = "public_photos.visibility = 'public' AND public_photos.status = 'ready'";

    expect(buildPublicCollectionBySlugQuery()).toContain(publicPhotoJoin);
    expect(buildPublicCollectionBySlugQuery()).toContain("COUNT(public_photos.id) AS photo_count");
  });
});
