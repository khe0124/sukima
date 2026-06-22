import { afterEach, describe, expect, it, vi } from "vitest";

import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/auth";

import { GET } from "./route";

describe("GET /api/admin/auth/google/callback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an admin session for the configured Google account", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.AUTH_SECRET = "test-secret-at-least-thirty-two-characters";

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "google-access-token" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: "admin@example.com", verified_email: true }), {
          status: 200
        })
      );

    const request = new Request(
      "http://localhost:3000/api/admin/auth/google/callback?code=auth-code&state=state-token",
      {
        headers: {
          cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=state-token`
        }
      }
    );

    const response = await GET(request as never);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin/photos");
    expect(response.headers.get("set-cookie")).toContain("sukima_admin_session=");
    expect(response.headers.get("set-cookie")).toContain(`${GOOGLE_OAUTH_STATE_COOKIE}=`);
  });

  it("rejects Google accounts that are not the configured admin", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.AUTH_SECRET = "test-secret-at-least-thirty-two-characters";

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "google-access-token" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: "other@example.com", verified_email: true }), {
          status: 200
        })
      );

    const request = new Request(
      "http://localhost:3000/api/admin/auth/google/callback?code=auth-code&state=state-token",
      {
        headers: {
          cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=state-token`
        }
      }
    );

    const response = await GET(request as never);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/admin/login?error=");
    expect(response.headers.get("set-cookie")).not.toContain("sukima_admin_session=");
  });
});
