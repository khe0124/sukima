"use client";

import React from "react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { CollectionListItem } from "@/server/collections";
import type { TagListItem } from "@/server/tags";
import type { PhotoListItem } from "@/types/photo";
import { UPLOAD_VISIBILITY_OPTIONS } from "@/types/upload";

type RepresentativeGalleryItem = {
  id: string;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
};

function getRepresentativeGalleryItems(photo: PhotoListItem): RepresentativeGalleryItem[] {
  if (photo.assets && photo.assets.length > 0) {
    return photo.assets.map((asset) => ({
      id: asset.id,
      imageUrl: asset.thumbnailUrl || asset.mediumUrl || asset.largeUrl,
      width: asset.width,
      height: asset.height,
      isPrimary: asset.isPrimary
    }));
  }

  return [
    {
      id: photo.id,
      imageUrl: photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl,
      width: photo.width,
      height: photo.height,
      isPrimary: true
    }
  ];
}

export function EditPhotoForm({
  photo,
  collections = [],
  tags: availableTags = []
}: {
  photo: PhotoListItem;
  collections?: CollectionListItem[];
  tags?: TagListItem[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("Ready");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(photo.collectionIds ?? []);
  const [selectedTags, setSelectedTags] = useState<string[]>(photo.tags);
  const galleryItems = getRepresentativeGalleryItems(photo);
  const initialPrimaryAssetId = galleryItems.find((item) => item.isPrimary)?.id ?? galleryItems[0]?.id ?? photo.id;
  const [selectedPrimaryAssetId, setSelectedPrimaryAssetId] = useState(initialPrimaryAssetId);
  const selectedGalleryItem = galleryItems.find((item) => item.id === selectedPrimaryAssetId);
  const canChangeRepresentative = Boolean(photo.assets && photo.assets.some((asset) => asset.thumbnailUrl || asset.mediumUrl || asset.largeUrl));
  const shouldSubmitRepresentative =
    canChangeRepresentative &&
    selectedPrimaryAssetId !== initialPrimaryAssetId &&
    Boolean(selectedGalleryItem?.imageUrl);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const takenAtValue = String(form.get("takenAt") || "");

    setStatus("Saving...");
    const response = await fetch(`/api/photos/${photo.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: String(form.get("title") || ""),
        description: String(form.get("description") || ""),
        takenAt: takenAtValue ? new Date(takenAtValue).toISOString() : "",
        tags: Array.from(
          new Set([
            ...selectedTags,
            ...String(form.get("tags") || "")
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          ])
        ),
        visibility: String(form.get("visibility") || "private"),
        collectionIds: selectedCollectionIds,
        ...(shouldSubmitRepresentative ? { primaryAssetId: selectedPrimaryAssetId } : {})
      })
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Save failed.");
      return;
    }

    setStatus("Saved.");
    router.refresh();
  }

  async function handleProcess() {
    setStatus("Processing...");
    const response = await fetch(`/api/photos/${photo.id}/process`, {
      method: "POST"
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Processing failed.");
      return;
    }

    setStatus("Processed.");
    router.refresh();
  }

  async function handleDownload() {
    setStatus("Creating download URL...");
    const response = await fetch(`/api/photos/${photo.id}/download-url`);

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Download URL failed.");
      return;
    }

    const body = (await response.json()) as { downloadUrl: string };
    window.location.assign(body.downloadUrl);
    setStatus("Download started.");
  }

  async function handleDelete() {
    if (!window.confirm("Delete this photo from the archive?")) return;

    setStatus("Deleting...");
    const response = await fetch(`/api/photos/${photo.id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Delete failed.");
      return;
    }

    router.push("/admin/photos");
  }

  const takenAt = photo.takenAt ? photo.takenAt.slice(0, 16) : "";

  return (
    <form className="upload-form" onSubmit={handleSave}>
      <fieldset className="representative-gallery">
        <legend>Representative image</legend>
        <div className="representative-gallery-grid">
          {galleryItems.map((item, index) => {
            const label = `Representative image ${index + 1}`;
            const isSelectable = Boolean(item.imageUrl);

            return (
              <label
                className="representative-gallery-item"
                data-selected={selectedPrimaryAssetId === item.id}
                key={item.id}
              >
                <input
                  aria-label={label}
                  checked={selectedPrimaryAssetId === item.id}
                  disabled={!isSelectable}
                  name="primaryAssetId"
                  onChange={() => setSelectedPrimaryAssetId(item.id)}
                  type="radio"
                  value={item.id}
                />
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    height={item.height || 600}
                    src={item.imageUrl}
                    width={item.width || 800}
                  />
                ) : (
                  <span className="representative-gallery-placeholder">No image</span>
                )}
                <span>{selectedPrimaryAssetId === item.id ? "Representative" : `Image ${index + 1}`}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="field-group">
        <span className="field-label">Title</span>
        <input name="title" type="text" maxLength={160} defaultValue={photo.title ?? ""} />
      </label>
      <label className="field-group">
        <span className="field-label">Description</span>
        <textarea name="description" rows={5} maxLength={2000} defaultValue={photo.description ?? ""} />
      </label>
      <label className="field-group">
        <span className="field-label">Taken at</span>
        <input name="takenAt" type="datetime-local" defaultValue={takenAt} />
      </label>
      <label className="field-group">
        <span className="field-label">Tags</span>
        <input
          aria-label="Tags"
          aria-describedby="edit-photo-tags-help"
          name="tags"
          type="text"
          placeholder="street, night, seoul"
        />
        <span className="field-help" id="edit-photo-tags-help">
          Add comma-separated tags. Existing checked tags are kept.
        </span>
      </label>
      {availableTags.length > 0 ? (
        <details className="check-menu">
          <summary>Existing tags ({selectedTags.length})</summary>
          <div>
            {availableTags.map((tag) => (
              <label key={tag.id}>
                <input
                  checked={selectedTags.includes(tag.name)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setSelectedTags((current) =>
                      checked
                        ? [...current, tag.name]
                        : current.filter((name) => name !== tag.name)
                    );
                  }}
                  type="checkbox"
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        </details>
      ) : null}
      {collections.length > 0 ? (
        <fieldset className="visibility-control">
          <legend>Collections</legend>
          <div>
            {collections.map((collection) => (
              <label key={collection.id}>
                <input
                  checked={selectedCollectionIds.includes(collection.id)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setSelectedCollectionIds((current) =>
                      checked
                        ? [...current, collection.id]
                        : current.filter((id) => id !== collection.id)
                    );
                  }}
                  type="checkbox"
                />
                <span>{collection.title}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="visibility-control">
        <legend>Visibility</legend>
        <div>
          {UPLOAD_VISIBILITY_OPTIONS.map((option) => (
            <label key={option.value}>
              <input
                defaultChecked={(photo.visibility ?? "private") === option.value}
                name="visibility"
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="form-actions">
        <button type="submit">Save</button>
        <button className="secondary-button" type="button" onClick={handleProcess}>
          Reprocess
        </button>
        <button className="secondary-button" type="button" onClick={handleDownload}>
          Download original
        </button>
        <button className="danger-button" type="button" onClick={handleDelete}>
          Delete
        </button>
      </div>
      <p className="form-status" role="status">{status}</p>
    </form>
  );
}
