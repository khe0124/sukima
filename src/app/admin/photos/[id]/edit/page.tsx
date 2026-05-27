/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";

import { getCollections } from "@/server/collections";
import { getAdminPhotoByIdWithRelations } from "@/server/photos";
import { getTags } from "@/server/tags";

import { EditPhotoForm } from "./EditPhotoForm";

export const dynamic = "force-dynamic";

export default async function EditPhotoPage({ params }: { params: { id: string } }) {
  const [photo, collections, tags] = await Promise.all([
    getAdminPhotoByIdWithRelations(params.id),
    getCollections(),
    getTags()
  ]);

  if (!photo) {
    notFound();
  }

  const imageUrl = photo.mediumUrl || photo.thumbnailUrl || photo.largeUrl;

  return (
    <main className="shell">
      <section className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>Edit Photo</h1>
        <p>
          {photo.status} · {photo.visibility}
        </p>
      </section>

      {imageUrl ? (
        <img
          className="edit-preview"
          alt={photo.title || "Photo preview"}
          height={photo.height || 900}
          src={imageUrl}
          width={photo.width || 1200}
        />
      ) : null}

      <EditPhotoForm photo={photo} collections={collections} tags={tags} />
    </main>
  );
}
