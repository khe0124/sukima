/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { getPhotos } from "@/server/photos";

export const dynamic = "force-dynamic";

export default async function ArchivePage({
  searchParams
}: {
  searchParams: { cursor?: string; tag?: string };
}) {
  const activeTag = searchParams.tag?.trim() || "";
  const photos = await getPhotos({
    limit: "30",
    cursor: searchParams.cursor ?? null,
    tag: activeTag || null
  });
  const nextHref = photos.nextCursor
    ? `/archive?${new URLSearchParams({
        ...(activeTag ? { tag: activeTag } : {}),
        cursor: photos.nextCursor
      }).toString()}`
    : "";

  return (
    <main className="shell archive-shell">
      <section className="page-heading">
        <p className="eyebrow">Archive</p>
        <h1>{activeTag ? `#${activeTag}` : "Photos"}</h1>
        <p>A public selection from the archive.</p>
        <p>
          <Link href="/collections">View collections</Link>
        </p>
        {activeTag ? (
          <p>
            <Link href="/archive">Clear filter</Link>
          </p>
        ) : null}
      </section>

      {photos.items.length > 0 ? (
        <div className="photo-grid">
          {photos.items.map((photo) => {
            const href = photo.slug ? `/archive/${photo.slug}` : "#";
            const imageUrl = photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl;

            return (
              <Link className="photo-tile" href={href} key={photo.id}>
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
                {photo.tags.length > 0 ? (
                  <span className="photo-tags">
                    {photo.tags.slice(0, 3).map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <p>No public photos are ready yet.</p>
      )}

      {nextHref ? (
        <p className="pagination-row">
          <Link className="button-link secondary" href={nextHref}>
            More
          </Link>
        </p>
      ) : null}
    </main>
  );
}
