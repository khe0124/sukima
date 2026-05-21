"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { PhotoListItem } from "@/types/photo";

export function EditPhotoForm({ photo }: { photo: PhotoListItem }) {
  const router = useRouter();
  const [status, setStatus] = useState("Ready");

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
        tags: String(form.get("tags") || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        visibility: String(form.get("visibility") || "private")
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
      <label>
        Title
        <input name="title" type="text" maxLength={160} defaultValue={photo.title ?? ""} />
      </label>
      <label>
        Description
        <textarea name="description" rows={5} maxLength={2000} defaultValue={photo.description ?? ""} />
      </label>
      <label>
        Taken at
        <input name="takenAt" type="datetime-local" defaultValue={takenAt} />
      </label>
      <label>
        Tags
        <input name="tags" type="text" defaultValue={photo.tags.join(", ")} />
      </label>
      <label>
        Visibility
        <select name="visibility" defaultValue={photo.visibility ?? "private"}>
          <option value="private">Private</option>
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="draft">Draft</option>
        </select>
      </label>
      <div className="action-row">
        <button type="submit">Save</button>
        <button type="button" onClick={handleProcess}>
          Reprocess
        </button>
        <button type="button" onClick={handleDownload}>
          Download original
        </button>
        <button className="danger-button" type="button" onClick={handleDelete}>
          Delete
        </button>
      </div>
      <p role="status">{status}</p>
    </form>
  );
}
