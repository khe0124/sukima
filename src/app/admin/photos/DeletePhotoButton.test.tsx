// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DeletePhotoButton from "./DeletePhotoButton";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh
  })
}));

describe("DeletePhotoButton", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("soft deletes a photo through the admin API and refreshes the list", async () => {
    render(<DeletePhotoButton photoId="photo-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/photos/photo-1", {
        method: "DELETE"
      });
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not call the API when the confirmation is cancelled", () => {
    vi.mocked(confirm).mockReturnValue(false);

    render(<DeletePhotoButton photoId="photo-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
