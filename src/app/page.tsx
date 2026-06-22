import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import React from "react";

import { ViewedPhotoTile } from "@/app/archive/ViewedPhoto";
import { Pagination } from "@/components/Pagination";
import {
  buildCanonicalUrl,
  getDefaultSeoDescription,
  getSeoDescription,
  getSeoTitle,
  getSiteName,
  serializeJsonLd,
} from "@/lib/seo";
import { getPhotos } from "@/server/photos";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: { page?: string; tag?: string };
};

export function generateMetadata({ searchParams }: HomePageProps): Metadata {
  const activeTag = searchParams?.tag?.trim() || "";
  const title = activeTag ? `#${activeTag} Photos` : getSiteName();
  const description = activeTag
    ? getSeoDescription(
        `Public photos tagged ${activeTag} from Sukima Photo Archive.`,
      )
    : getDefaultSeoDescription();
  const canonicalPath = activeTag
    ? `/?tag=${encodeURIComponent(activeTag)}`
    : "/";

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      url: buildCanonicalUrl(canonicalPath),
      title: activeTag ? getSeoTitle(title) : getSeoTitle(),
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: activeTag ? getSeoTitle(title) : getSeoTitle(),
      description,
    },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const activeTag = searchParams?.tag?.trim() || "";
  const photos = await getPhotos({
    limit: "30",
    page: searchParams?.page ?? null,
    tag: activeTag || null,
  });
  const buildHomeHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (activeTag) params.set("tag", activeTag);
    if (targetPage > 1) params.set("page", String(targetPage));
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : "/";
  };
  const canonicalPath = activeTag
    ? `/?tag=${encodeURIComponent(activeTag)}`
    : "/";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: activeTag ? `#${activeTag} Photos` : getSiteName(),
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
          image:
            photo.thumbnailUrl ||
            photo.mediumUrl ||
            photo.largeUrl ||
            undefined,
        })),
    },
  };

  return (
    <main className="shell shell-wide">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className="page-heading">
        <p className="eyebrow">Photo Archive</p>
        <h1 className="flex justify-center">
          <Image
            alt=""
            className="h-auto max-w-full"
            height={20}
            src="/sukiiima.svg"
            width={88}
          />
          <span className="sr-only">Sukima Photo Archive</span>
        </h1>
        <p>
          Private originals, public-ready metadata, and a small admin upload
          workflow.
        </p>
        {activeTag ? (
          <div className="flex w-full items-center justify-between">
            <p className="m-0 text-[0.875rem] text-[var(--muted)]">
              #{activeTag}
            </p>
            <Link href="/">Clear filter</Link>
          </div>
        ) : null}
      </section>

      {photos.items.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-[14px]">
          {photos.items.map((photo) => {
            const href = photo.slug ? `/archive/${photo.slug}` : "#";
            const imageUrl =
              photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl;

            return (
              <ViewedPhotoTile
                href={href}
                imageUrl={imageUrl}
                key={photo.id}
                photo={photo}
              />
            );
          })}
        </div>
      ) : (
        <p>No public photos are ready yet.</p>
      )}

      <Pagination
        buildHref={buildHomeHref}
        currentPage={photos.page}
        totalPages={photos.totalPages}
      />
      <div className="mt-8 flex gap-2 justify-end border-t border-[var(--line)] pt-3">
        <Link className="" href="/collections">
          View collections
        </Link>
        <Link className="" href="/admin/photos">
          Admin
        </Link>
      </div>
    </main>
  );
}
