// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CollectionManager } from "./CollectionManager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

const photos = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Rain Walk",
    slug: "rain-walk",
    description: null,
    thumbnailUrl: "https://pub.example.com/public/photos/rain-thumb.webp",
    mediumUrl: null,
    largeUrl: null,
    blurUrl: null,
    width: 800,
    height: 600,
    takenAt: null,
    tags: ["street"]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Window Light",
    slug: "window-light",
    description: null,
    thumbnailUrl: null,
    mediumUrl: null,
    largeUrl: null,
    blurUrl: null,
    width: null,
    height: null,
    takenAt: null,
    tags: []
  }
];

describe("CollectionManager", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const requestUrl = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;

        if (requestUrl === "/api/collections") {
          return Response.json(
            {
              id: "660e8400-e29b-41d4-a716-446655440000",
              title: "New Collection",
              slug: "new-collection",
              description: null,
              visibility: "private",
              coverPhotoId: null,
              photoCount: 0
            },
            { status: 201 }
          );
        }

        if (requestUrl === "/api/collections/660e8400-e29b-41d4-a716-446655440000/photos") {
          return Response.json({ ok: true });
        }

        return Response.json({ error: `Unexpected request: ${requestUrl}` }, { status: 500 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a collection and saves selected photos", async () => {
    render(<CollectionManager collections={[]} photos={photos} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "New Collection" }
    });
    fireEvent.click(screen.getByLabelText("Select Rain Walk"));
    fireEvent.click(screen.getByLabelText("Select Window Light"));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/collections/660e8400-e29b-41d4-a716-446655440000/photos",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            photoIds: [
              "550e8400-e29b-41d4-a716-446655440000",
              "550e8400-e29b-41d4-a716-446655440001"
            ]
          })
        })
      );
    });
  });
});
