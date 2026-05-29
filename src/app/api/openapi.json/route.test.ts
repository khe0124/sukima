import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn()
}));

describe("GET /api/openapi.json", () => {
  it("returns a non-cacheable OpenAPI document for admins", async () => {
    const request = new Request("http://localhost:3000/api/openapi.json");

    const response = await GET(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths["/api/photos/upload-url"].post).toBeTruthy();
  });
});
