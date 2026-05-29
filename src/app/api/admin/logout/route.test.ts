import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/admin/logout", () => {
  it("clears the admin cookie and redirects to login", async () => {
    const request = new Request("http://localhost:3000/api/admin/logout", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000"
      }
    });

    const response = await POST(request as never);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin/login");
    expect(response.headers.get("set-cookie")).toContain("sukima_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
