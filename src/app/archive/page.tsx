/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";

import {
  buildCanonicalUrl,
  getDefaultSeoDescription,
  getSeoDescription,
  getSeoTitle,
  serializeJsonLd
} from "@/lib/seo";
import { getPhotos } from "@/server/photos";

import { ViewedPhotoTile } from "./ViewedPhoto";

export const dynamic = "force-dynamic";

type ArchivePageProps = {
  searchParams: { cursor?: string; tag?: string };
};

export function generateMetadata({ searchParams }: ArchivePageProps): Metadata {
  const activeTag = searchParams.tag?.trim() || "";
  const title = activeTag ? `#${activeTag} Photos` : "Photo Archive";
  const description = activeTag
    ? getSeoDescription(`Public photos tagged ${activeTag} from Sukima Photo Archive.`)
    : getDefaultSeoDescription();
  const canonicalPath = activeTag ? `/archive?tag=${encodeURIComponent(activeTag)}` : "/archive";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      type: "website",
      url: buildCanonicalUrl(canonicalPath),
      title: getSeoTitle(title),
      description
    },
    twitter: {
      card: "summary_large_image",
      title: getSeoTitle(title),
      description
    }
  };
}

export default async function ArchivePage({
  searchParams,
}: ArchivePageProps) {
  const activeTag = searchParams.tag?.trim() || "";
  const photos = await getPhotos({
    limit: "30",
    cursor: searchParams.cursor ?? null,
    tag: activeTag || null,
  });
  const nextHref = photos.nextCursor
    ? `/archive?${new URLSearchParams({
        ...(activeTag ? { tag: activeTag } : {}),
        cursor: photos.nextCursor,
      }).toString()}`
    : "";
  const canonicalPath = activeTag ? `/archive?tag=${encodeURIComponent(activeTag)}` : "/archive";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: activeTag ? `#${activeTag} Photos` : "Photo Archive",
    description: activeTag
      ? `Public photos tagged ${activeTag} from Sukima Photo Archive.`
      : getDefaultSeoDescription(),
    url: buildCanonicalUrl(canonicalPath),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: photos.items
        .filter((photo) => photo.slug)
        .map((photo, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: photo.title || "Untitled photo",
          url: buildCanonicalUrl(`/archive/${photo.slug}`),
          image: photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl || undefined
        }))
    }
  };

  return (
    <main className="shell w-[min(1180px,calc(100%_-_32px))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className="page-heading">
        <p className="eyebrow">Archive</p>
        {/* <h1 className="text-base">{activeTag ? `#${activeTag}` : "Photos"}</h1> */}
        <p>A public selection from the archive.</p>
        <p>
          <Link href="/collections">View collections</Link>
        </p>
        {activeTag ? (
          <p>
            <Link href="/archive">Clear filter</Link>
          </p>
        ) : null}
      </section>

      {photos.items.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-[14px]">
          {photos.items.map((photo) => {
            const href = photo.slug ? `/archive/${photo.slug}` : "#";
            const imageUrl =
              photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl;

            return (
              <ViewedPhotoTile href={href} imageUrl={imageUrl} key={photo.id} photo={photo} />
            );
          })}
        </div>
      ) : (
        <p>No public photos are ready yet.</p>
      )}

      {nextHref ? (
        <p className="pagination-row">
          <Link className="button-link secondary" href={nextHref}>
            More
          </Link>
        </p>
      ) : null}
    </main>
  );
}
