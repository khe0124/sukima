/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import React from "react";

type ViewedPhotoTilePhoto = {
  id: string;
  title: string | null;
  width: number | null;
  height: number | null;
  tags?: string[];
};

type ViewedPhotoImageProps = {
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

export function ViewedPhotoImage({ imageUrl, alt, width, height, className }: ViewedPhotoImageProps) {
  return (
    <img
      alt={alt}
      className={className}
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
    >
      {imageUrl ? (
        <ViewedPhotoImage
          alt={photo.title || "Archived photo"}
          className="block aspect-[4/3] h-auto w-full bg-[var(--line)] object-cover"
          height={photo.height || 900}
          imageUrl={imageUrl}
          width={photo.width || 1200}
        />
      ) : (
        <span className="grid aspect-[4/3] place-items-center border border-[var(--line)] text-[var(--muted)]">
          {placeholderText}
        </span>
      )}
      <span className="min-h-[1.4em] text-[0.75rem] text-[var(--muted)] [overflow-wrap:anywhere]">
        {photo.title || "Untitled"}
      </span>
      {showTags && photo.tags && photo.tags.length > 0 ? (
        <span className="flex flex-wrap gap-1.5 text-[0.6875rem] text-[var(--muted)]">
          {photo.tags.slice(0, 3).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </span>
      ) : null}
    </Link>
  );
}
