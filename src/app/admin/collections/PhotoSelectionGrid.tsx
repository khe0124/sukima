"use client";

import React from "react";

import type { PhotoListItem } from "@/types/photo";

export function PhotoSelectionGrid({
  photos,
  selectedPhotoIds,
  onChange
}: {
  photos: PhotoListItem[];
  selectedPhotoIds: string[];
  onChange: (photoIds: string[]) => void;
}) {
  const selected = new Set(selectedPhotoIds);

  function togglePhoto(photoId: string) {
    if (selected.has(photoId)) {
      onChange(selectedPhotoIds.filter((id) => id !== photoId));
      return;
    }

    onChange([...selectedPhotoIds, photoId]);
  }

  if (photos.length === 0) {
    return <p>No uploaded photos available.</p>;
  }

  return (
    <fieldset className="photo-selection">
      <legend>Photos</legend>
      <div className="photo-selection-grid">
        {photos.map((photo) => {
          const imageUrl = photo.thumbnailUrl || photo.mediumUrl || photo.largeUrl;
          const label = photo.title || photo.id;

          return (
            <label className="photo-selection-item" data-selected={selected.has(photo.id)} key={photo.id}>
              <input
                aria-label={`Select ${label}`}
                checked={selected.has(photo.id)}
                onChange={() => togglePhoto(photo.id)}
                type="checkbox"
              />
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" height={120} src={imageUrl} width={160} />
              ) : (
                <span className="photo-selection-placeholder">No image</span>
              )}
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
