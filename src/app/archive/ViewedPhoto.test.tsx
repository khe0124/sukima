// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ViewedPhotoTile } from "./ViewedPhoto";

describe("ViewedPhoto", () => {
  it("renders photo thumbnails without viewed-state effects", () => {
    window.localStorage.setItem("sukima:viewed-photo-ids", JSON.stringify(["photo-1"]));

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

    expect(screen.getByRole("img", { name: "Viewed photo" })).not.toHaveClass("grayscale");
  });
});
