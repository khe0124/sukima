/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import { cache } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import {
  buildCanonicalUrl,
  buildPhotoStructuredData,
  getSeoDescription,
  getSeoTitle,
  serializeJsonLd,
} from "@/lib/seo";
import {
  getPhotoBySlugWithAssets,
  getPublicPhotoNeighbors,
} from "@/server/photos";

export const dynamic = "force-dynamic";
const getCachedPhotoBySlugWithAssets = cache(getPhotoBySlugWithAssets);
const getCachedPublicPhotoNeighbors = cache(getPublicPhotoNeighbors);

type PhotoDetailPageProps = {
  params: { slug: string };
};

export async function generateMetadata({
  params,
}: PhotoDetailPageProps): Promise<Metadata> {
  const photo = await getCachedPhotoBySlugWithAssets(params.slug);

  if (!photo) {
    return {
      title: "Photo Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = photo.title || "Untitled Photo";
  const description = getSeoDescription(
    photo.description || `${title} from Sukima Photo Archive.`,
  );
  const imageUrl = photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl;

  return {
    title,
    description,
    alternates: {
      canonical: `/archive/${params.slug}`,
    },
    openGraph: {
      type: "article",
      url: buildCanonicalUrl(`/archive/${params.slug}`),
      title: getSeoTitle(title),
      description,
      publishedTime: photo.takenAt ?? photo.uploadedAt ?? undefined,
      tags: photo.tags,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: getSeoTitle(title),
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function PhotoDetailPage({
  params,
}: PhotoDetailPageProps) {
  const photo = await getCachedPhotoBySlugWithAssets(params.slug);

  if (!photo) {
    notFound();
  }

  const photoNeighbors = await getCachedPublicPhotoNeighbors(params.slug);
  const imageUrl = photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl;
  const structuredData = buildPhotoStructuredData({
    slug: photo.slug,
    title: photo.title,
    description: photo.description,
    imageUrl,
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt,
    uploadedAt: photo.uploadedAt,
    tags: photo.tags,
  });

  return (
    <main className="shell w-[min(720px,calc(100%_-_32px))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />

      <section className="self-start">
        <div className="flex gap-4">
          <Link className="self-start" href="/">
            ←
          </Link>
          <p className="eyebrow">Photo</p>
        </div>
        <div className="flex flex-col gap-2">
          <h1>{photo.title || "Untitled"}</h1>
        </div>
        {photo.takenAt ? (
          <p>
            Taken{" "}
            {new Intl.DateTimeFormat("ko-KR", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Seoul",
            }).format(new Date(photo.takenAt))}
          </p>
        ) : null}
        <div className="mt-6 text-sm text-gray-500 border-t border-gray-200 pt-6">
          {photo.description ? <p>{photo.description}</p> : null}
        </div>
        {photo.tags.length > 0 ? (
          <ul
            className="mt-6 flex list-none flex-wrap gap-2 p-0"
            aria-label="Photo tags"
          >
            {photo.tags.map((tag) => (
              <li
                className="border border-[var(--line)] bg-[var(--surface)] px-2.5 py-[5px] text-[0.75rem] text-[var(--muted)]"
                key={tag}
              >
                <Link
                  className="text-inherit no-underline"
                  href={`/?tag=${encodeURIComponent(tag)}`}
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6">
          {photo.assets &&
          photo.assets.filter((asset) => !asset.isPrimary).length > 0 ? (
            <div
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
              aria-label="Additional images"
            >
              {photo.assets
                .filter((asset) => !asset.isPrimary)
                .map((asset) => {
                  const assetUrl =
                    asset.largeUrl || asset.mediumUrl || asset.thumbnailUrl;

                  return assetUrl ? (
                    <img
                      alt=""
                      className="block h-auto w-full bg-[var(--line)]"
                      height={asset.height || 900}
                      key={asset.id}
                      src={assetUrl}
                      width={asset.width || 1200}
                    />
                  ) : null;
                })}
            </div>
          ) : null}
        </div>
      </section>
      <div className="w-full items-center justify-center">
        <nav
          aria-label="Photo navigation"
          className="mt-8 flex w-full flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-6"
        >
          <div className="flex gap-2">
            {photoNeighbors.previous ? (
              <Link
                aria-label={`Previous photo: ${photoNeighbors.previous.title || "Untitled"}`}
                className="button-link secondary"
                href={`/archive/${photoNeighbors.previous.slug}`}
              >
                <ArrowLeftIcon className="size-4" />
              </Link>
            ) : (
              <span aria-disabled="true" className="button-link secondary">
                <ArrowLeftIcon className="size-4" />
              </span>
            )}
            {photoNeighbors.next ? (
              <Link
                aria-label={`Next photo: ${photoNeighbors.next.title || "Untitled"}`}
                className="button-link secondary"
                href={`/archive/${photoNeighbors.next.slug}`}
              >
                <ArrowRightIcon className="size-4" />
              </Link>
            ) : (
              <span aria-disabled="true" className="button-link secondary">
                <ArrowRightIcon className="size-4" />
              </span>
            )}
          </div>
          <Link className="button-link secondary" href="/">
            List
          </Link>
        </nav>
      </div>
    </main>
  );
}
