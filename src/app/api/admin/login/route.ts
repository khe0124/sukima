import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  verifyAdminCredentials
} from "@/lib/auth";
import { getRequiredEnv } from "@/lib/env";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

async function parseLoginBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return {
      body: loginSchema.parse({
        email: form.get("email"),
        password: form.get("password")
      }),
      wantsRedirect: true
    };
  }

  return {
    body: loginSchema.parse(await request.json()),
    wantsRedirect: false
  };
}

async function createLoginSuccessResponse({
  email,
  wantsRedirect
}: {
  email: string;
  wantsRedirect: boolean;
}) {
  const response = wantsRedirect
    ? new NextResponse(null, {
        status: 303,
        headers: {
          location: "/admin/photos"
        }
      })
    : NextResponse.json({ ok: true });

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    await createAdminSessionToken({ email }),
    getAdminSessionCookieOptions()
  );

  return response;
}

function createLoginErrorResponse(message: string, status: number, wantsRedirect = false) {
  if (wantsRedirect) {
    return new NextResponse(null, {
      status: 303,
      headers: {
        location: `/admin/login?error=${encodeURIComponent(message)}`
      }
    });
  }

  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  let wantsRedirect = false;

  try {
    const parsed = await parseLoginBody(request);
    wantsRedirect = parsed.wantsRedirect;
    const body = parsed.body;
    const valid = await verifyAdminCredentials({
      email: body.email,
      password: body.password
    });

    if (!valid) {
      return createLoginErrorResponse("Invalid credentials.", 401, wantsRedirect);
    }

    return createLoginSuccessResponse({
      email: getRequiredEnv("ADMIN_EMAIL"),
      wantsRedirect
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return createLoginErrorResponse("Invalid login request.", 400, wantsRedirect);
    }

    return createLoginErrorResponse("Login failed.", 500, wantsRedirect);
  }
}
