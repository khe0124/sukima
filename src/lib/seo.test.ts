import { afterEach, describe, expect, it } from "vitest";

import {
  buildCanonicalUrl,
  buildCollectionStructuredData,
  buildPhotoStructuredData,
  getSiteUrl,
  getSeoDescription,
  getSeoTitle,
  serializeJsonLd
} from "./seo";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

describe("seo helpers", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("normalizes the configured site URL and falls back to localhost", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://photos.example.com/";

    expect(getSiteUrl()).toBe("https://photos.example.com");

    process.env.NEXT_PUBLIC_SITE_URL = "";

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("builds canonical URLs without duplicate slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://photos.example.com/";

    expect(buildCanonicalUrl("/archive/night")).toBe("https://photos.example.com/archive/night");
    expect(buildCanonicalUrl("collections")).toBe("https://photos.example.com/collections");
  });

  it("formats SEO titles and clamps descriptions", () => {
    expect(getSeoTitle("Archive")).toBe("Archive | Sukima Photo Archive");
    expect(getSeoTitle("Sukima Photo Archive")).toBe("Sukima Photo Archive");
    expect(getSeoDescription("  A quiet\n\nphoto archive   ")).toBe("A quiet photo archive");
    expect(getSeoDescription("x".repeat(180))).toHaveLength(157);
  });

  it("builds privacy-safe structured data for public photos", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://photos.example.com";

    const data = buildPhotoStructuredData({
      slug: "rainy-night-1234",
      title: "Rainy Night",
      description: "A rainy street photograph.",
      imageUrl: "https://cdn.example.com/photos/rainy-night-large.webp",
      width: 1600,
      height: 1067,
      takenAt: "2026-05-18T20:13:00+09:00",
      tags: ["night", "street"]
    });

    expect(data["@type"]).toBe("ImageObject");
    expect(data.contentUrl).toBe("https://cdn.example.com/photos/rainy-night-large.webp");
    expect(data.url).toBe("https://photos.example.com/archive/rainy-night-1234");
    expect(data.keywords).toEqual(["night", "street"]);
    expect(data).not.toHaveProperty("contentLocation");
  });

  it("builds collection structured data with item URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://photos.example.com";

    const data = buildCollectionStructuredData({
      slug: "seoul-night",
      title: "Seoul Night",
      description: null,
      photos: [
        {
          slug: "first-photo",
          title: "First photo",
          imageUrl: "https://cdn.example.com/photos/first.webp"
        }
      ]
    });

    expect(data["@type"]).toBe("CollectionPage");
    expect(data.url).toBe("https://photos.example.com/collections/seoul-night");
    expect(data.mainEntity.itemListElement[0].url).toBe(
      "https://photos.example.com/archive/first-photo"
    );
  });

  it("serializes JSON-LD without allowing script tag breaks", () => {
    expect(serializeJsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain(
      "</script>"
    );
  });
});
