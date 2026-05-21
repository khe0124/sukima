/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { getPublicCollections } from "@/server/collections";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const collections = await getPublicCollections();

  return (
    <main className="shell archive-shell">
      <section className="page-heading">
        <p className="eyebrow">Collections</p>
        <h1>Photo Collections</h1>
        <p>Curated groups from the archive.</p>
      </section>

      {collections.length > 0 ? (
        <div className="collection-grid">
          {collections.map((collection) => (
            <Link className="collection-card" href={`/collections/${collection.slug}`} key={collection.id}>
              {collection.coverImageUrl ? (
                <img alt={collection.title} height={900} src={collection.coverImageUrl} width={1200} />
              ) : (
                <span className="photo-placeholder">No cover</span>
              )}
              <span>
                <strong>{collection.title}</strong>
                <small>{collection.photoCount} photos</small>
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
