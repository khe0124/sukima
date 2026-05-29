/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { getPhotos } from "@/server/photos";

import DeletePhotoButton from "./DeletePhotoButton";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage({
  searchParams
}: {
  searchParams: {
    cursor?: string;
    limit?: string;
    search?: string;
    tag?: string;
    status?: string;
    visibility?: string;
    sort?: string;
  };
}) {
  const limit = searchParams.limit ?? "30";
  const search = searchParams.search?.trim() ?? "";
  const tag = searchParams.tag?.trim() ?? "";
  const status = searchParams.status ?? "";
  const visibility = searchParams.visibility ?? "";
  const sort = searchParams.sort ?? "newest";
  const photos = await getPhotos({
    limit,
    cursor: searchParams.cursor ?? null,
    includePrivate: true,
    search: search || null,
    tag: tag || null,
    status: status || null,
    visibility: visibility || null,
    sort
  });
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries({ limit, search, tag, status, visibility, sort })) {
    if (value) nextParams.set(key, value);
  }
  if (photos.nextCursor) nextParams.set("cursor", photos.nextCursor);

  return (
    <main className="shell w-[min(1180px,calc(100%_-_32px))]">
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

      <form className="admin-photo-controls" method="get">
        <label>
          Search
          <input defaultValue={search} name="search" placeholder="Title, description, tag" type="search" />
        </label>
        <label>
          Tag
          <input defaultValue={tag} name="tag" placeholder="street" />
        </label>
        <label>
          Status
          <select defaultValue={status} name="status">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="uploading">Uploading</option>
            <option value="processing">Processing</option>
            <option value="ready">Ready</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label>
          Visibility
          <select defaultValue={visibility} name="visibility">
            <option value="">All visibility</option>
            <option value="private">Private</option>
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <label>
          Sort
          <select defaultValue={sort} name="sort">
            <option value="newest">Newest uploaded</option>
            <option value="oldest">Oldest uploaded</option>
            <option value="taken-newest">Newest taken</option>
            <option value="taken-oldest">Oldest taken</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
          </select>
        </label>
        <label>
          Page size
          <input defaultValue={limit} inputMode="numeric" min="1" max="100" name="limit" type="number" />
        </label>
        <div className="admin-photo-control-actions">
          <button className="button-link" type="submit">
            Apply
          </button>
          <Link className="button-link secondary" href="/admin/photos">
            Reset
          </Link>
        </div>
      </form>

      {photos.items.length > 0 ? (
        <div className="admin-photo-list">
          {photos.items.map((photo) => {
            const imageUrl = photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl;

            return (
              <article className="admin-photo-row admin-photo-row-with-preview" key={photo.id}>
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
                <div className="admin-photo-actions">
                  <Link className="button-link secondary" href={`/admin/photos/${photo.id}/edit`}>
                    Edit
                  </Link>
                  <DeletePhotoButton photoId={photo.id} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p>No photos yet.</p>
      )}

      {photos.nextCursor ? (
        <p className="pagination-row">
          <Link className="button-link secondary" href={`/admin/photos?${nextParams.toString()}`}>
            Next page
          </Link>
        </p>
      ) : null}
    </main>
  );
}
