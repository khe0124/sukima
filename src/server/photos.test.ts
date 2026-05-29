import { describe, expect, it } from "vitest";

import {
  getCollectionMembershipChanges,
  parseCreatePhotoRequest,
  parsePhotoListQuery,
  parseUpdatePhotoRequest
} from "./photos";

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

  it("rejects photo asset payloads without exactly one representative image", () => {
    expect(() =>
      parseCreatePhotoRequest({
        photoId: "550e8400-e29b-41d4-a716-446655440000",
        storageKeyOriginal: "private/originals/2026/05/26/550e8400-e29b-41d4-a716-446655440000-original.png",
        assets: [
          {
            storageKeyOriginal: "private/originals/2026/05/26/550e8400-e29b-41d4-a716-446655440000-original.png"
          }
        ]
      })
    ).toThrow("Exactly one representative image is required.");
  });

  it("rejects photo asset payloads when the representative does not match the photo original", () => {
    expect(() =>
      parseCreatePhotoRequest({
        photoId: "550e8400-e29b-41d4-a716-446655440000",
        storageKeyOriginal: "private/originals/2026/05/26/550e8400-e29b-41d4-a716-446655440000-original.png",
        assets: [
          {
            storageKeyOriginal: "private/originals/2026/05/26/550e8400-e29b-41d4-a716-446655440001-original.png",
            isPrimary: true
          }
        ]
      })
    ).toThrow("Representative image must match the primary original key.");
  });

  it("rejects duplicate photo asset original keys", () => {
    expect(() =>
      parseCreatePhotoRequest({
        photoId: "550e8400-e29b-41d4-a716-446655440000",
        storageKeyOriginal: "private/originals/2026/05/26/550e8400-e29b-41d4-a716-446655440000-original.png",
        assets: [
          {
            storageKeyOriginal: "private/originals/2026/05/26/550e8400-e29b-41d4-a716-446655440000-original.png",
            isPrimary: true
          },
          {
            storageKeyOriginal: "private/originals/2026/05/26/550e8400-e29b-41d4-a716-446655440000-original.png"
          }
        ]
      })
    ).toThrow("Duplicate photo asset original key.");
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

  it("accepts a primary asset id when changing the representative image", () => {
    expect(
      parseUpdatePhotoRequest({
        primaryAssetId: "660e8400-e29b-41d4-a716-446655440000"
      })
    ).toEqual({
      primaryAssetId: "660e8400-e29b-41d4-a716-446655440000"
    });
  });

  it("keeps tags absent for partial representative-only updates", () => {
    expect(parseUpdatePhotoRequest({})).toEqual({});
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

describe("parsePhotoListQuery", () => {
  it("normalizes admin list query options for filters, search, sorting, and page size", () => {
    expect(
      parsePhotoListQuery({
        limit: "200",
        cursor: "cursor-photo",
        search: "  rainy night  ",
        tag: "Street",
        status: "ready",
        visibility: "public",
        sort: "oldest"
      })
    ).toEqual({
      limit: 100,
      cursor: "cursor-photo",
      search: "rainy night",
      tag: "street",
      status: "ready",
      visibility: "public",
      sort: "oldest"
    });
  });

  it("drops unsupported filters and falls back to newest sorting", () => {
    expect(
      parsePhotoListQuery({
        limit: "0",
        cursor: "",
        search: "x".repeat(180),
        tag: "",
        status: "deleted",
        visibility: "everyone",
        sort: "random"
      })
    ).toEqual({
      limit: 30,
      cursor: null,
      search: "x".repeat(160),
      tag: null,
      status: null,
      visibility: null,
      sort: "newest"
    });
  });
});

describe("getCollectionMembershipChanges", () => {
  it("preserves existing memberships and only returns added or removed collections", () => {
    expect(getCollectionMembershipChanges(["collection-1", "collection-2"], ["collection-2", "collection-3"])).toEqual({
      removed: ["collection-1"],
      added: ["collection-3"]
    });
  });
});
