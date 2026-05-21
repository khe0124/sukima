import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn()
}));

describe("POST /api/photos/upload-url", () => {
  it("returns a clear error for native form posts", async () => {
    const request = new Request("http://localhost:3000/api/photos/upload-url", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        files: "water.jpg"
      })
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "Upload requires JavaScript. Please use the upload form button again after the page finishes loading."
    });
  });
});
