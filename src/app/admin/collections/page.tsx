import { getCollections } from "@/server/collections";

import { CollectionManager } from "./CollectionManager";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const collections = await getCollections();

  return (
    <main className="shell archive-shell">
      <section className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>Collections</h1>
        <p>Create curated groups of photos and control their visibility.</p>
      </section>

      <CollectionManager collections={collections} />
    </main>
  );
}
