/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { ViewedPhotoImage } from "@/app/archive/ViewedPhoto";
import { getPublicCollections } from "@/server/collections";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const collections = await getPublicCollections();

  return (
    <main className="shell w-[min(1180px,calc(100%_-_32px))]">
      <section className="page-heading">
        <p className="eyebrow">Collections</p>
        <h1>Photo Collections</h1>
        <p>Curated groups from the archive.</p>
      </section>

      {collections.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {collections.map((collection) => (
            <Link
              className="grid gap-2.5 text-[var(--foreground)] no-underline"
              href={`/collections/${collection.slug}`}
              key={collection.id}
            >
              {collection.coverImageUrl && collection.coverPhotoId ? (
                <ViewedPhotoImage
                  alt={collection.title}
                  className="block aspect-[4/3] h-auto w-full bg-[var(--line)] object-cover"
                  height={900}
                  imageUrl={collection.coverImageUrl}
                  photoId={collection.coverPhotoId}
                  width={1200}
                />
              ) : collection.coverImageUrl ? (
                <img
                  alt={collection.title}
                  className="block aspect-[4/3] h-auto w-full bg-[var(--line)] object-cover"
                  height={900}
                  src={collection.coverImageUrl}
                  width={1200}
                />
              ) : (
                <span className="grid aspect-[4/3] place-items-center border border-[var(--line)] text-[var(--muted)]">
                  No cover
                </span>
              )}
              <span>
                <strong className="block">{collection.title}</strong>
                <small className="mt-1 block text-[var(--muted)]">{collection.photoCount} photos</small>
              </span>
              {collection.description ? <p>{collection.description}</p> : null}
            </Link>
          ))}
        </div>
      ) : (
        <p>No public collections yet.</p>
      )}
    </main>
  );
}
