import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn()
}));

vi.mock("@/server/photos", () => ({
  createPhotoAsset: vi.fn(async () => ({
    id: "660e8400-e29b-41d4-a716-446655440000"
  })),
  getPhotoAssets: vi.fn()
}));

describe("POST /api/photos/:id/assets", () => {
  it("creates metadata for an uploaded additional photo asset", async () => {
    const request = new Request("http://localhost:3000/api/photos/550e8400-e29b-41d4-a716-446655440000/assets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000"
      },
      body: JSON.stringify({
        assetId: "660e8400-e29b-41d4-a716-446655440000",
        storageKeyOriginal: "private/originals/2026/05/26/660e8400-e29b-41d4-a716-446655440000-original.jpg",
        fileSize: 4096,
        mimeType: "image/jpeg"
      })
    });

    const response = await POST(request as never, {
      params: { id: "550e8400-e29b-41d4-a716-446655440000" }
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      id: "660e8400-e29b-41d4-a716-446655440000"
    });
  });
});
