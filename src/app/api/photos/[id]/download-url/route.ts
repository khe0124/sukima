import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { NO_STORE_HEADERS } from "@/lib/security";
import { createPhotoOriginalDownloadUrl } from "@/server/photos";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const result = await createPhotoOriginalDownloadUrl(params.id);

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download URL failed.";
    const status = message === "Unauthorized." ? 401 : message === "Photo not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
