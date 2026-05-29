"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { useState } from "react";

export default function DeletePhotoButton({ photoId }: { photoId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function deletePhoto() {
    if (!window.confirm("Delete this photo from the archive?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/photos/${encodeURIComponent(photoId)}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Photo delete failed.");
      }

      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button className="button-link danger" disabled={isDeleting} onClick={deletePhoto} type="button">
      {isDeleting ? "Deleting" : "Delete"}
    </button>
  );
}
