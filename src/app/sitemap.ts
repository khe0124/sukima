import type { MetadataRoute } from "next";

import { buildCanonicalUrl } from "@/lib/seo";
import { getPublicCollectionSitemapEntries } from "@/server/collections";
import { getPublicPhotoSitemapEntries } from "@/server/photos";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [photos, collections] = await Promise.all([
    getPublicPhotoSitemapEntries().catch(() => []),
    getPublicCollectionSitemapEntries().catch(() => [])
  ]);

  return [
    {
      url: buildCanonicalUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: buildCanonicalUrl("/collections"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
    ...photos.map((photo) => ({
      url: buildCanonicalUrl(`/archive/${photo.slug}`),
      lastModified: new Date(photo.lastModified),
      changeFrequency: "monthly" as const,
      priority: 0.7
    })),
    ...collections.map((collection) => ({
      url: buildCanonicalUrl(`/collections/${collection.slug}`),
      lastModified: new Date(collection.lastModified),
      changeFrequency: "weekly" as const,
      priority: 0.75
    }))
  ];
}
