import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn()
}));

vi.mock("@/lib/r2", () => ({
  createOriginalUploadUrl: vi.fn().mockResolvedValue("https://r2.example/upload")
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

  it("rejects cross-origin upload URL requests", async () => {
    const request = new Request("http://localhost:3000/api/photos/upload-url", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example"
      },
      body: JSON.stringify({
        filename: "waterdrop.png",
        contentType: "image/png",
        size: 53397
      })
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Invalid request origin." });
  });

  it("marks successful signed upload URL responses as non-cacheable", async () => {
    const request = new Request("http://localhost:3000/api/photos/upload-url", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000"
      },
      body: JSON.stringify({
        filename: "waterdrop.png",
        contentType: "image/png",
        size: 53397
      })
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.uploadUrl).toBe("https://r2.example/upload");
    expect(body.storageKeyOriginal).toMatch(
      /^private\/originals\/\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]+-original\.png$/
    );
  });
});
