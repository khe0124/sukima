/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPhotoBySlugWithAssets } from "@/server/photos";

export const dynamic = "force-dynamic";

export default async function PhotoDetailPage({ params }: { params: { slug: string } }) {
  const photo = await getPhotoBySlugWithAssets(params.slug);

  if (!photo) {
    notFound();
  }

  const imageUrl = photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl;

  return (
    <main className="photo-detail">
      <div className="photo-stage">
        {imageUrl ? (
          <img
            alt={photo.title || "Archived photo"}
            height={photo.height || 1200}
            src={imageUrl}
            width={photo.width || 1800}
          />
        ) : null}
      </div>

      <section className="photo-meta">
        <p className="eyebrow">Photo</p>
        <h1>{photo.title || "Untitled"}</h1>
        {photo.description ? <p>{photo.description}</p> : null}
        {photo.takenAt ? (
          <p>
            Taken{" "}
            {new Intl.DateTimeFormat("ko-KR", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Seoul"
            }).format(new Date(photo.takenAt))}
          </p>
        ) : null}
        {photo.tags.length > 0 ? (
          <ul className="tag-list" aria-label="Photo tags">
            {photo.tags.map((tag) => (
              <li key={tag}>
                <Link href={`/archive?tag=${encodeURIComponent(tag)}`}>{tag}</Link>
              </li>
            ))}
          </ul>
        ) : null}
        {photo.assets && photo.assets.filter((asset) => !asset.isPrimary).length > 0 ? (
          <div className="detail-asset-grid" aria-label="Additional images">
            {photo.assets
              .filter((asset) => !asset.isPrimary)
              .map((asset) => {
                const assetUrl = asset.largeUrl || asset.mediumUrl || asset.thumbnailUrl;

                return assetUrl ? (
                  <img
                    alt=""
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
