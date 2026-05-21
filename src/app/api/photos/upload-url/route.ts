import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth";
import { buildOriginalStorageKey, parseUploadUrlRequest } from "@/lib/photos";
import { createOriginalUploadUrl } from "@/lib/r2";

export const runtime = "nodejs";

const javascriptUploadRequiredMessage =
  "Upload requires JavaScript. Please use the upload form button again after the page finishes loading.";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: javascriptUploadRequiredMessage }, { status: 400 });
    }

    const body = await request.json();
    const upload = parseUploadUrlRequest(body);
    const photoId = randomUUID();
    const storageKeyOriginal = buildOriginalStorageKey({
      photoId,
      contentType: upload.contentType
    });
    const uploadUrl = await createOriginalUploadUrl({
      storageKey: storageKeyOriginal,
      contentType: upload.contentType
    });

    return NextResponse.json({
      uploadUrl,
      photoId,
      storageKeyOriginal
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Upload URL failed.";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized." ? 401 : 500 });
  }
}
