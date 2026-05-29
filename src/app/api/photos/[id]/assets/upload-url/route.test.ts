import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn()
}));

vi.mock("@/lib/r2", () => ({
  createOriginalUploadUrl: vi.fn().mockResolvedValue("https://r2.example/upload")
}));

vi.mock("@/server/photos", () => ({
  getAdminPhotoById: vi.fn().mockResolvedValue({
    id: "550e8400-e29b-41d4-a716-446655440000"
  })
}));

describe("POST /api/photos/:id/assets/upload-url", () => {
  it("creates a non-cacheable signed upload URL for an additional photo asset", async () => {
    const request = new Request(
      "http://localhost:3000/api/photos/550e8400-e29b-41d4-a716-446655440000/assets/upload-url",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000"
        },
        body: JSON.stringify({
          filename: "detail.jpg",
          contentType: "image/jpeg",
          size: 4096
        })
      }
    );

    const response = await POST(request as never, {
      params: { id: "550e8400-e29b-41d4-a716-446655440000" }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.uploadUrl).toBe("https://r2.example/upload");
    expect(body.assetId).toMatch(/^[0-9a-f-]+$/);
    expect(body.storageKeyOriginal).toMatch(
      /^private\/originals\/\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]+-original\.jpg$/
    );
  });
});
