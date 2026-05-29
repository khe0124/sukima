import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth";
import { assertSameOriginRequest, getApiErrorStatus } from "@/lib/security";
import { createPhotoAsset, getPhotoAssets } from "@/server/photos";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const assets = await getPhotoAssets(params.id);

    return NextResponse.json({ items: assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo asset lookup failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    const asset = await createPhotoAsset(params.id, await request.json());

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Photo asset creation failed.";
    const status =
      message === "Photo not found."
        ? 404
        : message === "Photo asset already exists."
          ? 409
          : getApiErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}
