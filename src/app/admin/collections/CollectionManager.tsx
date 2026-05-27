"use client";

import React from "react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { CollectionListItem } from "@/server/collections";
import type { PhotoListItem } from "@/types/photo";

import { PhotoSelectionGrid } from "./PhotoSelectionGrid";

type CreatedCollection = {
  id: string;
};

export function CollectionManager({
  collections,
  photos
}: {
  collections: CollectionListItem[];
  photos: PhotoListItem[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("Ready");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

  async function createCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

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

    const collection = (await response.json()) as CreatedCollection;
    const photoResponse = await fetch(`/api/collections/${collection.id}/photos`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photoIds: selectedPhotoIds })
    });

    if (!photoResponse.ok) {
      const error = await photoResponse.json();
      setStatus(error.error || "Collection photos save failed.");
      return;
    }

    formElement.reset();
    setSelectedPhotoIds([]);
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
        <PhotoSelectionGrid photos={photos} selectedPhotoIds={selectedPhotoIds} onChange={setSelectedPhotoIds} />
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
