import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/admin/auth/google", () => {
  it("redirects to Google with a CSRF state cookie", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.ADMIN_EMAIL = "admin@example.com";

    const request = new Request("http://localhost:3000/api/admin/auth/google");

    const response = await GET(request as never);
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(response.headers.get("set-cookie")).toContain("sukima_google_oauth_state=");
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth?");
    expect(location).toContain("client_id=google-client-id");
    expect(location).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fadmin%2Fauth%2Fgoogle%2Fcallback"
    );
    expect(location).toContain("scope=openid+email+profile");
    expect(location).toContain("login_hint=admin%40example.com");
  });
});
