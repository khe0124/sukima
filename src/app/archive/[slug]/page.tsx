/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPhotoBySlugWithAssets } from "@/server/photos";

import { ViewedPhotoMarker } from "../ViewedPhoto";

export const dynamic = "force-dynamic";

export default async function PhotoDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const photo = await getPhotoBySlugWithAssets(params.slug);

  if (!photo) {
    notFound();
  }

  const imageUrl = photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl;

  return (
    <main className="shell w-[min(720px,calc(100%_-_32px))]">
      <ViewedPhotoMarker photoId={photo.id} />
      <section className="self-start">
        <p className="eyebrow">Photo</p>
        <h1>{photo.title || "Untitled"}</h1>
        {photo.description ? <p>{photo.description}</p> : null}
        {photo.takenAt ? (
          <p>
            Taken{" "}
            {new Intl.DateTimeFormat("ko-KR", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Seoul",
            }).format(new Date(photo.takenAt))}
          </p>
        ) : null}
        {photo.tags.length > 0 ? (
          <ul
            className="mt-6 flex list-none flex-wrap gap-2 p-0"
            aria-label="Photo tags"
          >
            {photo.tags.map((tag) => (
              <li
                className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-[5px] text-[0.9rem] text-[var(--muted)]"
                key={tag}
              >
                <Link
                  className="text-inherit no-underline"
                  href={`/archive?tag=${encodeURIComponent(tag)}`}
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {imageUrl ? (
          <img
            alt={photo.title || "Archived photo"}
            className="block h-auto max-h-[calc(100vh_-_64px)] w-full bg-[var(--line)] object-contain"
            height={photo.height || 1200}
            src={imageUrl}
            width={photo.width || 1800}
          />
        ) : null}
        {photo.assets &&
        photo.assets.filter((asset) => !asset.isPrimary).length > 0 ? (
          <div className="mt-6 grid gap-3" aria-label="Additional images">
            {photo.assets
              .filter((asset) => !asset.isPrimary)
              .map((asset) => {
                const assetUrl =
                  asset.largeUrl || asset.mediumUrl || asset.thumbnailUrl;

                return assetUrl ? (
                  <img
                    alt=""
                    className="block h-auto w-full bg-[var(--line)]"
                    height={asset.height || 900}
                    key={asset.id}
                    src={assetUrl}
                    width={asset.width || 1200}
                  />
                ) : null;
              })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
