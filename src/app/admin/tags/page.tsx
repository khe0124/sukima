import { getTags } from "@/server/tags";

import { TagManager } from "./TagManager";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  const tags = await getTags();

  return (
    <main className="shell shell-wide">
      <section className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>Tags</h1>
        <p>Rename, create, and remove tags used across photos.</p>
      </section>

      <TagManager tags={tags} />
    </main>
  );
}
