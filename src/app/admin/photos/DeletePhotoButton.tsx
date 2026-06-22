"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { useState } from "react";
import { Trash2Icon } from "lucide-react";

export default function DeletePhotoButton({ photoId }: { photoId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function deletePhoto() {
    if (!window.confirm("Delete this photo from the archive?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/photos/${encodeURIComponent(photoId)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Photo delete failed.");
      }

      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Trash2Icon
      className="w-4 h-4 cursor-pointer text-red-700 hover:text-red-900"
      onClick={deletePhoto}
    >
      <button
        className="hidden"
        disabled={isDeleting}
        onClick={deletePhoto}
        type="button"
      >
        {isDeleting ? "Deleting" : "Delete"}
      </button>
    </Trash2Icon>
  );
}
