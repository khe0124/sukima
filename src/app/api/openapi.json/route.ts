import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { buildOpenApiDocument } from "@/lib/openapi";
import { getApiErrorStatus, NO_STORE_HEADERS } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    return NextResponse.json(buildOpenApiDocument(), {
      headers: NO_STORE_HEADERS
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAPI document lookup failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}
