import { getCollections } from "@/server/collections";
import { getPhotos } from "@/server/photos";

import { CollectionManager } from "./CollectionManager";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const [collections, photos] = await Promise.all([
    getCollections(),
    getPhotos({ limit: "100", page: "1", includePrivate: true })
  ]);

  return (
    <main className="shell w-[min(1180px,calc(100%_-_32px))]">
      <section className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>Collections</h1>
        <p>Create curated groups of photos and control their visibility.</p>
      </section>

      <CollectionManager collections={collections} photos={photos.items} />
    </main>
  );
}
