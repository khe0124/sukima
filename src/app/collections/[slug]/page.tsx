import { notFound } from "next/navigation";

import { ViewedPhotoTile } from "@/app/archive/ViewedPhoto";
import { getPublicCollectionBySlug } from "@/server/collections";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({ params }: { params: { slug: string } }) {
  const result = await getPublicCollectionBySlug(params.slug);

  if (!result) {
    notFound();
  }

  return (
    <main className="shell w-[min(1180px,calc(100%_-_32px))]">
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
