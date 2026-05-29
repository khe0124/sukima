import { NextRequest, NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { assertSameOriginRequest, getApiErrorStatus } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginRequest(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: {
      location: "/admin/login"
    }
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
