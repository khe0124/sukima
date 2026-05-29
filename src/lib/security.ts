import { NextRequest } from "next/server";

export const INVALID_REQUEST_ORIGIN_MESSAGE = "Invalid request origin.";
export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store"
};

function parseOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(request: Request) {
  const origins = new Set<string>();

  origins.add(new URL(request.url).origin);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const siteOrigin = parseOrigin(siteUrl ?? null);
  if (siteOrigin) {
    origins.add(siteOrigin);
  }

  return origins;
}

export function assertSameOriginRequest(request: Request | NextRequest) {
  const origin = parseOrigin(request.headers.get("origin"));
  const referer = parseOrigin(request.headers.get("referer"));
  const requestOrigin = origin ?? referer;

  // Admin mutations use cookie auth, so verify the browser's source origin to reduce CSRF exposure.
  if (!requestOrigin) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(INVALID_REQUEST_ORIGIN_MESSAGE);
    }

    return;
  }

  if (!getAllowedOrigins(request).has(requestOrigin)) {
    throw new Error(INVALID_REQUEST_ORIGIN_MESSAGE);
  }
}

export function getApiErrorStatus(message: string, fallbackStatus = 500) {
  if (message === "Unauthorized.") {
    return 401;
  }

  if (message === INVALID_REQUEST_ORIGIN_MESSAGE) {
    return 403;
  }

  return fallbackStatus;
}
