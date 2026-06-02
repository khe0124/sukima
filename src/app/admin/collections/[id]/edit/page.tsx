import { notFound } from "next/navigation";

import { getCollectionById, getCollectionPhotoIds } from "@/server/collections";
import { getPhotos } from "@/server/photos";

import { EditCollectionForm } from "./EditCollectionForm";

export const dynamic = "force-dynamic";

export default async function EditCollectionPage({ params }: { params: { id: string } }) {
  const [collection, photoIds, photos] = await Promise.all([
    getCollectionById(params.id),
    getCollectionPhotoIds(params.id),
    getPhotos({ limit: "100", page: "1", includePrivate: true })
  ]);

  if (!collection) {
    notFound();
  }

  return (
    <main className="shell">
      <section className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>Edit Collection</h1>
        <p>{collection.photoCount} photos</p>
      </section>

      <EditCollectionForm collection={collection} photoIds={photoIds} photos={photos.items} />
    </main>
  );
}
