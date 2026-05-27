// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ViewedPhotoMarker, ViewedPhotoTile, VIEWED_PHOTOS_STORAGE_KEY } from "./ViewedPhoto";

describe("ViewedPhoto", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders a viewed photo image in grayscale", async () => {
    window.localStorage.setItem(VIEWED_PHOTOS_STORAGE_KEY, JSON.stringify(["photo-1"]));

    render(
      <ViewedPhotoTile
        href="/archive/photo-1"
        imageUrl="https://cdn.example/photo-1.webp"
        photo={{
          id: "photo-1",
          title: "Viewed photo",
          width: 1200,
          height: 900,
          tags: ["seoul"]
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Viewed photo" })).toHaveClass("grayscale");
    });
  });

  it("records a viewed photo id in localStorage", async () => {
    render(<ViewedPhotoMarker photoId="photo-2" />);

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(VIEWED_PHOTOS_STORAGE_KEY) || "[]")).toContain("photo-2");
    });
  });
});
