import { randomBytes } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { GOOGLE_OAUTH_STATE_COOKIE, getGoogleOAuthStateCookieOptions } from "@/lib/auth";
import { getRequiredEnv } from "@/lib/env";
import { NO_STORE_HEADERS } from "@/lib/security";

export const runtime = "nodejs";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: NextRequest) {
  const state = randomBytes(32).toString("base64url");
  const redirectUri = new URL("/api/admin/auth/google/callback", request.url);
  const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_URL);

  authorizationUrl.searchParams.set("client_id", getRequiredEnv("GOOGLE_CLIENT_ID"));
  authorizationUrl.searchParams.set("redirect_uri", redirectUri.toString());
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("prompt", "select_account");
  authorizationUrl.searchParams.set("login_hint", getRequiredEnv("ADMIN_EMAIL"));

  const response = NextResponse.redirect(authorizationUrl, {
    headers: NO_STORE_HEADERS
  });

  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, getGoogleOAuthStateCookieOptions());

  return response;
}
