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
    expect(screen.getByRole("radio", { name: "Representative image 1" }).closest("label")).toHaveAttribute(
      "data-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: "Representative image 2" }));
    expect(screen.getByRole("radio", { name: "Representative image 2" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Representative image 2" }).closest("label")).toHaveAttribute(
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
});
