"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { TagListItem } from "@/server/tags";

export function TagManager({ tags }: { tags: TagListItem[] }) {
  const router = useRouter();
  const [status, setStatus] = useState("Ready");

  async function createTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setStatus("Creating tag...");
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: String(form.get("name") || "") })
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Tag creation failed.");
      return;
    }

    event.currentTarget.reset();
    setStatus("Tag created.");
    router.refresh();
  }

  async function updateTag(tagId: string, form: HTMLFormElement) {
    const formData = new FormData(form);

    setStatus("Saving tag...");
    const response = await fetch(`/api/tags/${tagId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: String(formData.get("name") || "") })
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Tag update failed.");
      return;
    }

    setStatus("Tag saved.");
    router.refresh();
  }

  async function deleteTag(tagId: string) {
    if (!window.confirm("Delete this tag? It will be removed from photos.")) return;

    setStatus("Deleting tag...");
    const response = await fetch(`/api/tags/${tagId}`, { method: "DELETE" });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Tag delete failed.");
      return;
    }

    setStatus("Tag deleted.");
    router.refresh();
  }

  return (
    <div className="manager-stack">
      <form className="inline-form" onSubmit={createTag}>
        <label className="field-group">
          <span className="field-label">New tag</span>
          <input name="name" maxLength={40} required />
        </label>
        <button type="submit">Create</button>
      </form>

      <div className="manager-list">
        {tags.map((tag) => (
          <form
            className="manager-row"
            key={tag.id}
            onSubmit={(event) => {
              event.preventDefault();
              updateTag(tag.id, event.currentTarget);
            }}
          >
            <label className="field-group">
              <span className="field-label">Name</span>
              <input name="name" maxLength={40} defaultValue={tag.name} required />
            </label>
            <span>{tag.photoCount} photos</span>
            <button type="submit">Save</button>
            <button className="danger-button" type="button" onClick={() => deleteTag(tag.id)}>
              Delete
            </button>
          </form>
        ))}
      </div>

      <p role="status">{status}</p>
    </div>
  );
}
