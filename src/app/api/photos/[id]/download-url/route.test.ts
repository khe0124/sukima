import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn()
}));

vi.mock("@/server/photos", () => ({
  createPhotoOriginalDownloadUrl: vi.fn().mockResolvedValue({
    downloadUrl: "https://r2.example/download",
    expiresIn: 600
  })
}));

describe("GET /api/photos/:id/download-url", () => {
  it("marks signed download URL responses as non-cacheable", async () => {
    const request = new Request("http://localhost:3000/api/photos/photo-1/download-url");
    const response = await GET(request as never, { params: { id: "photo-1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      downloadUrl: "https://r2.example/download",
      expiresIn: 600
    });
  });
});
