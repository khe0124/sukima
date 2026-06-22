import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  getExpiredGoogleOAuthStateCookieOptions,
  isConfiguredAdminEmail
} from "@/lib/auth";
import { getRequiredEnv } from "@/lib/env";
import { NO_STORE_HEADERS } from "@/lib/security";

export const runtime = "nodejs";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1)
});

const userInfoSchema = z.object({
  email: z.string().email(),
  verified_email: z.boolean().optional()
});

function redirectToLogin(message: string) {
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      ...NO_STORE_HEADERS,
      location: `/admin/login?error=${encodeURIComponent(message)}`
    }
  });

  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    "",
    getExpiredGoogleOAuthStateCookieOptions()
  );

  return response;
}

function getCookieValue(request: NextRequest, name: string) {
  const nextCookie = request.cookies?.get(name)?.value;
  if (nextCookie) return nextCookie;

  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return undefined;
}

async function exchangeCodeForAccessToken({
  code,
  redirectUri
}: {
  code: string;
  redirectUri: string;
}) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed.");
  }

  return tokenResponseSchema.parse(await response.json()).access_token;
}

async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Google profile lookup failed.");
  }

  return userInfoSchema.parse(await response.json());
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = getCookieValue(request, GOOGLE_OAUTH_STATE_COOKIE);

  if (!code || !state || !storedState || state !== storedState) {
    return redirectToLogin("Invalid Google login request.");
  }

  try {
    const redirectUri = new URL("/api/admin/auth/google/callback", request.url).toString();
    const accessToken = await exchangeCodeForAccessToken({ code, redirectUri });
    const profile = await fetchGoogleUserInfo(accessToken);

    if (profile.verified_email === false || !isConfiguredAdminEmail(profile.email)) {
      return redirectToLogin("Google account is not allowed.");
    }

    const response = new NextResponse(null, {
      status: 303,
      headers: {
        ...NO_STORE_HEADERS,
        location: "/admin/photos"
      }
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      await createAdminSessionToken({ email: getRequiredEnv("ADMIN_EMAIL") }),
      getAdminSessionCookieOptions()
    );
    response.cookies.set(
      GOOGLE_OAUTH_STATE_COOKIE,
      "",
      getExpiredGoogleOAuthStateCookieOptions()
    );

    return response;
  } catch {
    return redirectToLogin("Google login failed.");
  }
}
