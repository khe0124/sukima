import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ViewedPhotoTile } from "@/app/archive/ViewedPhoto";
import {
  buildCanonicalUrl,
  buildCollectionStructuredData,
  getSeoDescription,
  getSeoTitle,
  serializeJsonLd
} from "@/lib/seo";
import { getPublicCollectionBySlug } from "@/server/collections";

export const dynamic = "force-dynamic";
const getCachedPublicCollectionBySlug = cache(getPublicCollectionBySlug);

type CollectionDetailPageProps = {
  params: { slug: string };
};

export async function generateMetadata({
  params
}: CollectionDetailPageProps): Promise<Metadata> {
  const result = await getCachedPublicCollectionBySlug(params.slug);

  if (!result) {
    return {
      title: "Collection Not Found",
      robots: {
        index: false,
        follow: false
      }
    };
  }

  const description = getSeoDescription(
    result.collection.description ||
      `${result.collection.title} photo collection from Sukima Photo Archive.`
  );
  const coverImage =
    result.collection.coverImageUrl ||
    result.photos[0]?.thumbnailUrl ||
    result.photos[0]?.mediumUrl ||
    result.photos[0]?.largeUrl ||
    null;

  return {
    title: result.collection.title,
    description,
    alternates: {
      canonical: `/collections/${params.slug}`
    },
    openGraph: {
      type: "website",
      url: buildCanonicalUrl(`/collections/${params.slug}`),
      title: getSeoTitle(result.collection.title),
      description,
      images: coverImage
        ? [
            {
              url: coverImage,
              width: 1200,
              height: 900,
              alt: result.collection.title
            }
          ]
        : undefined
    },
    twitter: {
      card: coverImage ? "summary_large_image" : "summary",
      title: getSeoTitle(result.collection.title),
      description,
      images: coverImage ? [coverImage] : undefined
    }
  };
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const result = await getCachedPublicCollectionBySlug(params.slug);

  if (!result) {
    notFound();
  }
  const structuredData = buildCollectionStructuredData({
    slug: result.collection.slug,
    title: result.collection.title,
    description: result.collection.description,
    photos: result.photos.map((photo) => ({
      slug: photo.slug,
      title: photo.title,
      imageUrl: photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl
    }))
  });

  return (
    <main className="shell shell-wide">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className="page-heading">
        <p className="eyebrow">Collection</p>
        <h1>{result.collection.title}</h1>
        {result.collection.description ? <p>{result.collection.description}</p> : null}
        <p>{result.photos.length} photos</p>
      </section>

      {result.photos.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-[14px]">
          {result.photos.map((photo) => {
            const imageUrl = photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl;

            return (
              <ViewedPhotoTile
                href={photo.slug ? `/archive/${photo.slug}` : "#"}
                imageUrl={imageUrl}
                key={photo.id}
                photo={photo}
                showTags={false}
              />
            );
          })}
        </div>
      ) : (
        <p>No public photos are in this collection yet.</p>
      )}
    </main>
  );
}
