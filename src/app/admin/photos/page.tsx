/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { getPhotos } from "@/server/photos";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage({
  searchParams
}: {
  searchParams: { cursor?: string };
}) {
  const photos = await getPhotos({
    limit: "50",
    cursor: searchParams.cursor ?? null,
    includePrivate: true
  });

  return (
    <main className="shell archive-shell">
      <section className="page-heading row-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Photos</h1>
          <p>Review uploads, edit metadata, and retry failed processing.</p>
        </div>
        <Link className="button-link" href="/admin/photos/upload">
          Upload
        </Link>
        <Link className="button-link secondary" href="/admin/tags">
          Tags
        </Link>
        <Link className="button-link secondary" href="/admin/collections">
          Collections
        </Link>
      </section>

      {photos.items.length > 0 ? (
        <div className="admin-photo-list">
          {photos.items.map((photo) => {
            const imageUrl = photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl;

            return (
              <article className="admin-photo-row" key={photo.id}>
                {imageUrl ? (
                  <img alt={photo.title || "Photo preview"} height={120} src={imageUrl} width={160} />
                ) : (
                  <span className="admin-photo-placeholder">No image</span>
                )}
                <div>
                  <h2>{photo.title || "Untitled"}</h2>
                  <p>
                    {photo.status} · {photo.visibility}
                  </p>
                  {photo.tags.length > 0 ? <p>{photo.tags.join(", ")}</p> : null}
                </div>
                <Link className="button-link secondary" href={`/admin/photos/${photo.id}/edit`}>
                  Edit
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <p>No photos yet.</p>
      )}

      {photos.nextCursor ? (
        <p>
          <Link href={`/admin/photos?cursor=${encodeURIComponent(photos.nextCursor)}`}>More</Link>
        </p>
      ) : null}
    </main>
  );
}
