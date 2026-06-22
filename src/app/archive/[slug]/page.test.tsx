import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import PhotoDetailPage from "./page";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    cache: (callback: unknown) => callback
  };
});

vi.mock("@/server/photos", () => ({
  getPhotoBySlugWithAssets: vi.fn(async () => ({
    id: "photo-current",
    title: "Current Photo",
    slug: "current-photo",
    description: "A current photo.",
    status: "ready",
    visibility: "public",
    thumbnailUrl: "https://cdn.example.com/current-thumb.webp",
    mediumUrl: "https://cdn.example.com/current-medium.webp",
    largeUrl: "https://cdn.example.com/current-large.webp",
    blurUrl: null,
    width: 1200,
    height: 900,
    takenAt: null,
    uploadedAt: "2026-06-01T00:00:00.000Z",
    tags: [],
    assets: []
  })),
  getPublicPhotoNeighbors: vi.fn(async () => ({
    previous: {
      slug: "newer-photo",
      title: "Newer Photo"
    },
    next: {
      slug: "older-photo",
      title: "Older Photo"
    }
  }))
}));

describe("PhotoDetailPage", () => {
  it("renders archive navigation controls", async () => {
    const html = renderToStaticMarkup(
      await PhotoDetailPage({ params: { slug: "current-photo" } })
    );

    expect(html).toContain('href="/"');
    expect(html).toContain("← Archive");
    expect(html).toContain('href="/archive/newer-photo"');
    expect(html).toContain("Previous");
    expect(html).toContain('href="/archive/older-photo"');
    expect(html).toContain("Next");
  });
});
