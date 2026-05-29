/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  buildCanonicalUrl,
  buildPhotoStructuredData,
  getSeoDescription,
  getSeoTitle,
  serializeJsonLd
} from "@/lib/seo";
import { getPhotoBySlugWithAssets } from "@/server/photos";

import { ViewedPhotoMarker } from "../ViewedPhoto";

export const dynamic = "force-dynamic";

type PhotoDetailPageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PhotoDetailPageProps): Promise<Metadata> {
  const photo = await getPhotoBySlugWithAssets(params.slug);

  if (!photo) {
    return {
      title: "Photo Not Found",
      robots: {
        index: false,
        follow: false
      }
    };
  }

  const title = photo.title || "Untitled Photo";
  const description = getSeoDescription(photo.description || `${title} from Sukima Photo Archive.`);
  const imageUrl = photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl;

  return {
    title,
    description,
    alternates: {
      canonical: `/archive/${params.slug}`
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
              width: photo.width || 1200,
              height: photo.height || 900,
              alt: title
            }
          ]
        : undefined
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: getSeoTitle(title),
      description,
      images: imageUrl ? [imageUrl] : undefined
    }
  };
}

export default async function PhotoDetailPage({
  params,
}: PhotoDetailPageProps) {
  const photo = await getPhotoBySlugWithAssets(params.slug);

  if (!photo) {
    notFound();
  }

  const imageUrl = photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl;
  const structuredData = buildPhotoStructuredData({
    slug: photo.slug,
    title: photo.title,
    description: photo.description,
    imageUrl,
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt,
    tags: photo.tags
  });

  return (
    <main className="shell w-[min(720px,calc(100%_-_32px))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <ViewedPhotoMarker photoId={photo.id} />
      <section className="self-start">
        <p className="eyebrow">Photo</p>
        <h1>{photo.title || "Untitled"}</h1>
        {photo.description ? <p>{photo.description}</p> : null}
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
        {photo.tags.length > 0 ? (
          <ul
            className="mt-6 flex list-none flex-wrap gap-2 p-0"
            aria-label="Photo tags"
          >
            {photo.tags.map((tag) => (
              <li
                className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-[5px] text-[0.9rem] text-[var(--muted)]"
                key={tag}
              >
                <Link
                  className="text-inherit no-underline"
                  href={`/archive?tag=${encodeURIComponent(tag)}`}
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {imageUrl ? (
          <img
            alt={photo.title || "Archived photo"}
            className="block h-auto max-h-[calc(100vh_-_64px)] w-full bg-[var(--line)] object-contain"
            height={photo.height || 1200}
            src={imageUrl}
            width={photo.width || 1800}
          />
        ) : null}
        {photo.assets &&
        photo.assets.filter((asset) => !asset.isPrimary).length > 0 ? (
          <div className="mt-6 grid gap-3" aria-label="Additional images">
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
      </section>
    </main>
  );
}
