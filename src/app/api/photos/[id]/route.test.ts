import { describe, expect, it, vi } from "vitest";

import { PATCH } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/server/photos", () => ({
  getAdminPhotoById: vi.fn(),
  softDeletePhoto: vi.fn(),
  updatePhoto: vi.fn(async () => {
    throw new Error("Photo asset not found.");
  }),
}));

describe("PATCH /api/photos/:id", () => {
  it("returns 404 when the requested representative asset does not belong to the photo", async () => {
    const request = new Request("http://localhost:3000/api/photos/550e8400-e29b-41d4-a716-446655440000", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        primaryAssetId: "660e8400-e29b-41d4-a716-446655440000",
      }),
    });

    const response = await PATCH(request as never, {
      params: { id: "550e8400-e29b-41d4-a716-446655440000" },
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Photo asset not found." });
  });
});
