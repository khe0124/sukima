import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/admin/login", () => {
  it("accepts form posts and redirects after successful login", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.AUTH_SECRET = "test-secret-at-least-thirty-two-characters";

    const request = new Request("http://localhost:3000/api/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        email: "admin@example.com",
        password: "correct-password"
      })
    });

    const response = await POST(request as never);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin/photos");
    expect(response.headers.get("set-cookie")).toContain("sukima_admin_session=");
  });
});
