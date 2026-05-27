/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { getPhotos } from "@/server/photos";

import { ViewedPhotoTile } from "./ViewedPhoto";

export const dynamic = "force-dynamic";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: { cursor?: string; tag?: string };
}) {
  const activeTag = searchParams.tag?.trim() || "";
  const photos = await getPhotos({
    limit: "30",
    cursor: searchParams.cursor ?? null,
    tag: activeTag || null,
  });
  const nextHref = photos.nextCursor
    ? `/archive?${new URLSearchParams({
        ...(activeTag ? { tag: activeTag } : {}),
        cursor: photos.nextCursor,
      }).toString()}`
    : "";

  return (
    <main className="shell w-[min(1180px,calc(100%_-_32px))]">
      <section className="page-heading">
        <p className="eyebrow">Archive</p>
        {/* <h1 className="text-base">{activeTag ? `#${activeTag}` : "Photos"}</h1> */}
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-[14px]">
          {photos.items.map((photo) => {
            const href = photo.slug ? `/archive/${photo.slug}` : "#";
            const imageUrl =
              photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl;

            return (
              <ViewedPhotoTile href={href} imageUrl={imageUrl} key={photo.id} photo={photo} />
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
