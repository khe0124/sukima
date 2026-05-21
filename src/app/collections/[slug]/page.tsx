/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicCollectionBySlug } from "@/server/collections";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({ params }: { params: { slug: string } }) {
  const result = await getPublicCollectionBySlug(params.slug);

  if (!result) {
    notFound();
  }

  return (
    <main className="shell archive-shell">
      <section className="page-heading">
        <p className="eyebrow">Collection</p>
        <h1>{result.collection.title}</h1>
        {result.collection.description ? <p>{result.collection.description}</p> : null}
        <p>{result.photos.length} photos</p>
      </section>

      {result.photos.length > 0 ? (
        <div className="photo-grid">
          {result.photos.map((photo) => {
            const imageUrl = photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl;

            return (
              <Link className="photo-tile" href={photo.slug ? `/archive/${photo.slug}` : "#"} key={photo.id}>
                {imageUrl ? (
                  <img
                    alt={photo.title || "Archived photo"}
                    height={photo.height || 900}
                    src={imageUrl}
                    width={photo.width || 1200}
                  />
                ) : (
                  <span className="photo-placeholder">No image</span>
                )}
                <span className="photo-caption">{photo.title || "Untitled"}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p>No public photos are in this collection yet.</p>
      )}
    </main>
  );
}
