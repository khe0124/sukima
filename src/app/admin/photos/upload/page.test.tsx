// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UploadPageClient from "./UploadPageClient";

describe("UploadPageClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;

      if (requestUrl === "/api/photos/upload-url") {
        return Response.json({
          uploadUrl: "https://r2.example/upload",
          photoId: "photo-1",
          storageKeyOriginal: "private/originals/2026/05/21/photo-1-original.jpg"
        });
      }

      if (requestUrl === "https://r2.example/upload") {
        return Response.json({ ok: true }, { status: 200 });
      }

      if (requestUrl === "/api/photos") {
        return Response.json({ ok: true }, { status: 201 });
      }

      if (requestUrl === "/api/photos/photo-1/process") {
        return Response.json({ ok: true }, { status: 200 });
      }

      return Response.json({ error: `Unexpected request: ${requestUrl}` }, { status: 500 });
    }));
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn()
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders upload controls ready for client-side upload", () => {
    const html = renderToStaticMarkup(<UploadPageClient />);

    expect(html).toContain('<form class="upload-form" novalidate=""');
    expect(html).toContain('type="button"');
    expect(html).not.toContain("Loading upload form...");
    expect(html).toContain(">Upload</button>");
    expect(html).toContain('Drop images here or click to choose');
    expect(html).toContain("Toastify");
  });

  it("starts the upload URL API request after selecting a file and submitting", async () => {
    render(<UploadPageClient />);

    const file = new File(["image-bytes"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/images/i), {
      target: {
        files: [file]
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/photos/upload-url",
        expect.objectContaining({
          method: "POST"
        })
      );
    });
  });

  it("shows the validation failure instead of calling the API for an invalid file", async () => {
    render(<UploadPageClient />);

    const file = new File(["plain text"], "notes.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText(/images/i), {
      target: {
        files: [file]
      }
    });

    expect(screen.getByRole("status").textContent).toBe("notes.txt: Unsupported image type.");

    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(await screen.findAllByText("Unsupported image type.")).not.toHaveLength(0);
    expect(screen.getByRole("status").textContent).toBe("Fix invalid files before uploading.");
  });
});
