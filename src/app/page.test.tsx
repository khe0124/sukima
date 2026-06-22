import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { getPhotos } from "@/server/photos";

import HomePage from "./page";

vi.mock("@/server/photos", () => ({
  getPhotos: vi.fn(async () => ({
    items: [
      {
        id: "photo-1",
        title: "Morning Window",
        slug: "morning-window",
        thumbnailUrl: "https://cdn.example.com/photo-1-thumb.webp",
        mediumUrl: "https://cdn.example.com/photo-1-medium.webp",
        largeUrl: "https://cdn.example.com/photo-1-large.webp",
        width: 1200,
        height: 900,
        tags: ["home"]
      }
    ],
    page: 1,
    pageSize: 30,
    total: 1,
    totalPages: 1
  }))
}));

describe("HomePage", () => {
  it("renders the SVG logo in the main heading", async () => {
    const html = renderToStaticMarkup(await HomePage({ searchParams: {} }));

    expect(html).toContain('<h1');
    expect(html).toContain('src="/sukiiima.svg"');
    expect(html).toContain("Sukima Photo Archive");
  });

  it("renders the public archive gallery on the main screen", async () => {
    const html = renderToStaticMarkup(await HomePage({ searchParams: {} }));

    expect(html).toContain("Morning Window");
    expect(html).toContain('href="/archive/morning-window"');
    expect(html).toContain("https://cdn.example.com/photo-1-thumb.webp");
    expect(html).not.toContain('href="/archive">View archive');
  });

  it("uses the main page for archive tag filtering and pagination", async () => {
    const html = renderToStaticMarkup(
      await HomePage({ searchParams: { tag: "home", page: "2" } })
    );

    expect(getPhotos).toHaveBeenLastCalledWith({
      limit: "30",
      page: "2",
      tag: "home"
    });
    expect(html).toContain('href="/"');
    expect(html).toContain('class="flex w-full items-center justify-between"');
    expect(html).toContain("#home");
  });
});
