"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { CollectionListItem } from "@/server/collections";
import type { PhotoListItem } from "@/types/photo";

export function EditCollectionForm({
  collection,
  photoIds,
  photos
}: {
  collection: CollectionListItem;
  photoIds: string[];
  photos: PhotoListItem[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("Ready");

  async function saveCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setStatus("Saving collection...");
    const response = await fetch(`/api/collections/${collection.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title") || ""),
        description: String(form.get("description") || ""),
        visibility: String(form.get("visibility") || "private"),
        coverPhotoId: String(form.get("coverPhotoId") || "")
      })
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Collection save failed.");
      return;
    }

    const ids = String(form.get("photoIds") || "")
      .split(/\r?\n/)
      .map((id) => id.trim())
      .filter(Boolean);
    const photoResponse = await fetch(`/api/collections/${collection.id}/photos`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photoIds: ids })
    });

    if (!photoResponse.ok) {
      const error = await photoResponse.json();
      setStatus(error.error || "Collection photos save failed.");
      return;
    }

    setStatus("Collection saved.");
    router.refresh();
  }

  return (
    <form className="upload-form" onSubmit={saveCollection}>
      <label>
        Title
        <input name="title" maxLength={160} defaultValue={collection.title} required />
      </label>
      <label>
        Description
        <textarea name="description" rows={4} maxLength={2000} defaultValue={collection.description ?? ""} />
      </label>
      <label>
        Visibility
        <select name="visibility" defaultValue={collection.visibility}>
          <option value="private">Private</option>
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="draft">Draft</option>
        </select>
      </label>
      <label>
        Cover photo
        <select name="coverPhotoId" defaultValue={collection.coverPhotoId ?? ""}>
          <option value="">None</option>
          {photos.map((photo) => (
            <option key={photo.id} value={photo.id}>
              {photo.title || photo.id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Photo IDs
        <textarea name="photoIds" rows={8} defaultValue={photoIds.join("\n")} />
      </label>
      <button type="submit">Save</button>
      <p role="status">{status}</p>
    </form>
  );
}
