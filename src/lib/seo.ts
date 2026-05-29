const SITE_NAME = "Sukima Photo Archive";
const DEFAULT_SITE_URL = "http://localhost:3000";
const DEFAULT_DESCRIPTION =
  "A quiet personal photography archive with public galleries, collections, and privacy-first original storage.";
const DESCRIPTION_MAX_LENGTH = 157;

type PhotoStructuredDataInput = {
  slug: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  tags: string[];
};

type CollectionStructuredDataInput = {
  slug: string;
  title: string;
  description: string | null;
  photos: Array<{
    slug: string | null;
    title: string | null;
    imageUrl: string | null;
  }>;
};

export function getSiteName() {
  return SITE_NAME;
}

export function getDefaultSeoDescription() {
  return DEFAULT_DESCRIPTION;
}

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl) {
    return DEFAULT_SITE_URL;
  }

  try {
    const url = new URL(configuredUrl);
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function buildCanonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`.replace(/\/+$/, "");
}

export function getSeoTitle(title?: string | null) {
  const normalizedTitle = title?.trim();

  if (!normalizedTitle || normalizedTitle === SITE_NAME) {
    return SITE_NAME;
  }

  return `${normalizedTitle} | ${SITE_NAME}`;
}

export function getSeoDescription(description?: string | null) {
  const normalizedDescription = description?.replace(/\s+/g, " ").trim() || DEFAULT_DESCRIPTION;

  if (normalizedDescription.length <= DESCRIPTION_MAX_LENGTH) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
}

export function buildPhotoStructuredData(photo: PhotoStructuredDataInput) {
  const title = photo.title || "Untitled photo";
  const url = buildCanonicalUrl(`/archive/${photo.slug ?? photo.title ?? ""}`);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: title,
    description: getSeoDescription(photo.description || title),
    url,
    contentUrl: photo.imageUrl,
    thumbnailUrl: photo.imageUrl,
    datePublished: photo.takenAt ?? undefined,
    uploadDate: photo.takenAt ?? undefined,
    keywords: photo.tags
  };

  if (photo.width && photo.height) {
    data.width = photo.width;
    data.height = photo.height;
  }

  return withoutEmptyValues(data);
}

export function buildCollectionStructuredData(collection: CollectionStructuredDataInput) {
  return withoutEmptyValues({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: getSeoDescription(collection.description || `${collection.title} photo collection.`),
    url: buildCanonicalUrl(`/collections/${collection.slug}`),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: collection.photos
        .filter((photo) => photo.slug)
        .map((photo, index) =>
          withoutEmptyValues({
            "@type": "ListItem",
            position: index + 1,
            name: photo.title || "Untitled photo",
            url: buildCanonicalUrl(`/archive/${photo.slug}`),
            image: photo.imageUrl
          })
        )
    }
  });
}

export function withoutEmptyValues<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (Array.isArray(value)) return value.length > 0;
      return value !== "";
    })
  ) as T;
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
