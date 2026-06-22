// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PhotoTitleEditor from "./PhotoTitleEditor";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh
  })
}));

describe("PhotoTitleEditor", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          id: "photo-1",
          title: "Updated title",
          visibility: "public"
        })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates the photo title from the admin list", async () => {
    render(<PhotoTitleEditor photoId="photo-1" title="Original title" visibility="private" />);

    fireEvent.change(screen.getByLabelText("Photo title"), {
      target: { value: "Updated title" }
    });
    fireEvent.click(screen.getByRole("switch", { name: "Public visibility" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/photos/photo-1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Updated title",
          visibility: "public"
        })
      });
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
