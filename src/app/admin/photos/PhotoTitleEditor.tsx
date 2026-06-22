"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { FormEvent, useState } from "react";
import type { PhotoVisibility } from "@/types/photo";
import { PencilIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export default function PhotoTitleEditor({
  photoId,
  title,
  visibility,
}: {
  photoId: string;
  title: string | null;
  visibility: PhotoVisibility;
}) {
  const router = useRouter();
  const [value, setValue] = useState(title ?? "");
  const [isPublic, setIsPublic] = useState(visibility === "public");
  const [status, setStatus] = useState("Ready");
  const [isSaving, setIsSaving] = useState(false);

  async function saveTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("Saving...");

    try {
      const response = await fetch(
        `/api/photos/${encodeURIComponent(photoId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: value,
            visibility: isPublic ? "public" : "private",
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        setStatus(error.error || "Save failed.");
        return;
      }

      setStatus("Saved.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="admin-photo-title-form" onSubmit={saveTitle}>
      <label>
        <span className="sr-only">Photo title</span>
        <input
          aria-label="Photo title"
          maxLength={160}
          onChange={(event) => setValue(event.currentTarget.value)}
          placeholder="Untitled"
          type="text"
          value={value}
        />
      </label>
      <button
        className="button-link secondary"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Saving" : "Save"}
      </button>
      {isPublic ? (
        <EyeIcon
          aria-checked={isPublic}
          aria-label="Public visibility"
          className="w-4 h-4 cursor-pointer text-gray-700 hover:text-gray-900"
          onClick={() => setIsPublic((current) => !current)}
          role="switch"
          type="button"
        />
      ) : (
        <EyeOffIcon
          aria-checked={isPublic}
          aria-label="Public visibility"
          className="w-4 h-4 cursor-pointer text-gray-700 hover:text-gray-900"
          onClick={() => setIsPublic((current) => !current)}
          role="switch"
          type="button"
        />
      )}
      <span aria-live="polite" className="sr-only">
        {status}
      </span>
    </form>
  );
}
