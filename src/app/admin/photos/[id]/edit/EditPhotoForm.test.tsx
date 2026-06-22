// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditPhotoForm } from "./EditPhotoForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const photo = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "Window Light",
  slug: "window-light",
  description: "Morning frame",
  thumbnailUrl: null,
  mediumUrl: null,
  largeUrl: null,
  blurUrl: null,
  width: null,
  height: null,
  takenAt: null,
  tags: ["quiet"],
  visibility: "unlisted" as const,
  collectionIds: [],
  assets: [
    {
      id: "660e8400-e29b-41d4-a716-446655440000",
      photoId: "550e8400-e29b-41d4-a716-446655440000",
      thumbnailUrl: "https://pub.example.com/primary-thumb.webp",
      mediumUrl: null,
      largeUrl: null,
      blurUrl: null,
      width: 800,
      height: 600,
      sortOrder: 0,
      isPrimary: true,
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      photoId: "550e8400-e29b-41d4-a716-446655440000",
      thumbnailUrl: "https://pub.example.com/second-thumb.webp",
      mediumUrl: null,
      largeUrl: null,
      blurUrl: null,
      width: 800,
      height: 600,
      sortOrder: 1,
      isPrimary: false,
    },
  ],
};

describe("EditPhotoForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a radio group for visibility so the current state is scannable", () => {
    render(<EditPhotoForm photo={photo} />);

    expect(screen.queryByLabelText("Visibility")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Visibility" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Unlisted" })).toBeChecked();
  });

  it("shows photo assets as a representative gallery and submits the selected primary asset", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));

    render(<EditPhotoForm photo={photo} />);

    expect(screen.getByRole("group", { name: "Representative image" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Representative image 1" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Representative image 1" }).closest(".representative-gallery-item")).toHaveAttribute(
      "data-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: "Representative image 2" }));
    expect(screen.getByRole("radio", { name: "Representative image 2" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Representative image 2" }).closest(".representative-gallery-item")).toHaveAttribute(
      "data-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/photos/550e8400-e29b-41d4-a716-446655440000",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining(
            '"primaryAssetId":"660e8400-e29b-41d4-a716-446655440001"',
          ),
        }),
      );
    });
  });

  it("removes an image from the edit list and submits deleted asset ids on save", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));

    render(<EditPhotoForm photo={photo} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete image 2" }));

    expect(screen.queryByRole("radio", { name: "Representative image 2" })).not.toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toBe(
      "Image removed from this edit. Save to delete it from the post.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/photos/550e8400-e29b-41d4-a716-446655440000",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining(
            '"deletedAssetIds":["660e8400-e29b-41d4-a716-446655440001"]',
          ),
        }),
      );
    });
  });

  it("does not allow choosing assets without a public display image", () => {
    render(
      <EditPhotoForm
        photo={{
          ...photo,
          assets: [
            photo.assets[0],
            {
              ...photo.assets[1],
              thumbnailUrl: null,
              mediumUrl: null,
              largeUrl: null,
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("radio", { name: "Representative image 2" })).toBeDisabled();
  });

  it("uploads additional images for the current photo from the edit form", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url === "/api/photos/550e8400-e29b-41d4-a716-446655440000/assets/upload-url") {
        return Response.json({
          uploadUrl: "https://r2.example/asset-id",
          assetId: "770e8400-e29b-41d4-a716-446655440000",
          storageKeyOriginal: "private/originals/2026/05/27/770e8400-e29b-41d4-a716-446655440000-original.jpg",
        });
      }

      return Response.json({ ok: true }, { status: init.method === "POST" ? 201 : 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<EditPhotoForm photo={photo} />);

    const file = new File(["image"], "extra.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Select additional images/), {
      target: {
        files: [file],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload additional images" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/photos/550e8400-e29b-41d4-a716-446655440000/assets",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"assetId":"770e8400-e29b-41d4-a716-446655440000"'),
        }),
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/photos/550e8400-e29b-41d4-a716-446655440000/process",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
