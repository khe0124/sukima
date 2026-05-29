import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth";
import { assertSameOriginRequest, getApiErrorStatus } from "@/lib/security";
import { getAdminPhotoById, softDeletePhoto, updatePhoto } from "@/server/photos";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const photo = await getAdminPhotoById(params.id);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }

    return NextResponse.json(photo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo lookup failed.";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized." ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    const photo = await updatePhoto(params.id, await request.json());

    return NextResponse.json(photo);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Photo update failed.";
    const status =
      message === "Photo not found." || message === "Photo asset not found."
        ? 404
        : message === "Representative image is not ready."
          ? 400
          : getApiErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    await softDeletePhoto(params.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo delete failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}
