import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth";
import { buildOriginalStorageKey, parseUploadUrlRequest } from "@/lib/photos";
import { createOriginalUploadUrl } from "@/lib/r2";
import { assertSameOriginRequest, getApiErrorStatus, NO_STORE_HEADERS } from "@/lib/security";
import { getAdminPhotoById } from "@/server/photos";

export const runtime = "nodejs";

const javascriptUploadRequiredMessage =
  "Upload requires JavaScript. Please use the upload form button again after the page finishes loading.";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: javascriptUploadRequiredMessage }, { status: 400 });
    }

    const photo = await getAdminPhotoById(params.id);
    if (!photo) {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }

    const upload = parseUploadUrlRequest(await request.json());
    const assetId = randomUUID();
    const storageKeyOriginal = buildOriginalStorageKey({
      photoId: assetId,
      contentType: upload.contentType
    });
    const uploadUrl = await createOriginalUploadUrl({
      storageKey: storageKeyOriginal,
      contentType: upload.contentType
    });

    return NextResponse.json(
      {
        uploadUrl,
        assetId,
        storageKeyOriginal
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Upload URL failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}
