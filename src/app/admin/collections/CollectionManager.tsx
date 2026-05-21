"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { CollectionListItem } from "@/server/collections";

export function CollectionManager({ collections }: { collections: CollectionListItem[] }) {
  const router = useRouter();
  const [status, setStatus] = useState("Ready");

  async function createCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setStatus("Creating collection...");
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title") || ""),
        description: String(form.get("description") || ""),
        visibility: String(form.get("visibility") || "private")
      })
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Collection creation failed.");
      return;
    }

    event.currentTarget.reset();
    setStatus("Collection created.");
    router.refresh();
  }

  async function deleteCollection(collectionId: string) {
    if (!window.confirm("Delete this collection? Photos will stay in the archive.")) return;

    setStatus("Deleting collection...");
    const response = await fetch(`/api/collections/${collectionId}`, { method: "DELETE" });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Collection delete failed.");
      return;
    }

    setStatus("Collection deleted.");
    router.refresh();
  }

  return (
    <div className="manager-stack">
      <form className="upload-form" onSubmit={createCollection}>
        <label>
          Title
          <input name="title" maxLength={160} required />
        </label>
        <label>
          Description
          <textarea name="description" rows={3} maxLength={2000} />
        </label>
        <label>
          Visibility
          <select name="visibility" defaultValue="private">
            <option value="private">Private</option>
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <button type="submit">Create</button>
      </form>

      <div className="manager-list">
        {collections.map((collection) => (
          <article className="admin-photo-row" key={collection.id}>
            <div>
              <h2>{collection.title}</h2>
              <p>
                {collection.visibility} · {collection.photoCount} photos
              </p>
              {collection.description ? <p>{collection.description}</p> : null}
            </div>
            <a className="button-link secondary" href={`/admin/collections/${collection.id}/edit`}>
              Edit
            </a>
            <button className="danger-button plain-button" type="button" onClick={() => deleteCollection(collection.id)}>
              Delete
            </button>
          </article>
        ))}
      </div>

      <p role="status">{status}</p>
    </div>
  );
}
