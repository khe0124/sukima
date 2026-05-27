/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";

export const VIEWED_PHOTOS_STORAGE_KEY = "sukima:viewed-photo-ids";

const VIEWED_PHOTOS_CHANGED_EVENT = "sukima:viewed-photos-changed";
const MAX_VIEWED_PHOTOS = 500;

type ViewedPhotoTilePhoto = {
  id: string;
  title: string | null;
  width: number | null;
  height: number | null;
  tags?: string[];
};

type ViewedPhotoImageProps = {
  photoId: string;
  imageUrl: string;
  alt: string;
  width: number;
  height: number;
  className: string;
};

type ViewedPhotoTileProps = {
  href: string;
  imageUrl: string | null;
  photo: ViewedPhotoTilePhoto;
  placeholderText?: string;
  showTags?: boolean;
};

function readViewedPhotoIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const parsed = JSON.parse(window.localStorage.getItem(VIEWED_PHOTOS_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.filter((photoId): photoId is string => typeof photoId === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeViewedPhotoIds(viewedPhotoIds: Set<string>) {
  const ids = Array.from(viewedPhotoIds).slice(-MAX_VIEWED_PHOTOS);
  window.localStorage.setItem(VIEWED_PHOTOS_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(VIEWED_PHOTOS_CHANGED_EVENT));
}

function rememberViewedPhoto(photoId: string) {
  const viewedPhotoIds = readViewedPhotoIds();
  viewedPhotoIds.delete(photoId);
  viewedPhotoIds.add(photoId);
  writeViewedPhotoIds(viewedPhotoIds);
}

function useViewedPhotoIds() {
  const [viewedPhotoIds, setViewedPhotoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const syncViewedPhotoIds = () => {
      setViewedPhotoIds(readViewedPhotoIds());
    };

    syncViewedPhotoIds();
    window.addEventListener("storage", syncViewedPhotoIds);
    window.addEventListener(VIEWED_PHOTOS_CHANGED_EVENT, syncViewedPhotoIds);

    return () => {
      window.removeEventListener("storage", syncViewedPhotoIds);
      window.removeEventListener(VIEWED_PHOTOS_CHANGED_EVENT, syncViewedPhotoIds);
    };
  }, []);

  return viewedPhotoIds;
}

export function ViewedPhotoMarker({ photoId }: { photoId: string }) {
  useEffect(() => {
    rememberViewedPhoto(photoId);
  }, [photoId]);

  return null;
}

export function ViewedPhotoImage({ photoId, imageUrl, alt, width, height, className }: ViewedPhotoImageProps) {
  const viewedPhotoIds = useViewedPhotoIds();
  const isViewed = viewedPhotoIds.has(photoId);

  return (
    <img
      alt={alt}
      className={`${className}${isViewed ? " grayscale" : ""}`}
      height={height}
      src={imageUrl}
      width={width}
    />
  );
}

export function ViewedPhotoTile({
  href,
  imageUrl,
  photo,
  placeholderText = "No image",
  showTags = true
}: ViewedPhotoTileProps) {
  return (
    <Link
      className="grid gap-2 text-[var(--foreground)] no-underline"
      href={href}
      onClick={() => rememberViewedPhoto(photo.id)}
    >
      {imageUrl ? (
        <ViewedPhotoImage
          alt={photo.title || "Archived photo"}
          className="block aspect-[4/3] h-auto w-full bg-[var(--line)] object-cover"
          height={photo.height || 900}
          imageUrl={imageUrl}
          photoId={photo.id}
          width={photo.width || 1200}
        />
      ) : (
        <span className="grid aspect-[4/3] place-items-center border border-[var(--line)] text-[var(--muted)]">
          {placeholderText}
        </span>
      )}
      <span className="min-h-[1.4em] text-[0.92rem] text-[var(--muted)] [overflow-wrap:anywhere]">
        {photo.title || "Untitled"}
      </span>
      {showTags && photo.tags && photo.tags.length > 0 ? (
        <span className="flex flex-wrap gap-1.5 text-[0.78rem] text-[var(--muted)]">
          {photo.tags.slice(0, 3).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </span>
      ) : null}
    </Link>
  );
}
