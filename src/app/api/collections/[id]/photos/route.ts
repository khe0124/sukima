import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth";
import { assertSameOriginRequest, getApiErrorStatus } from "@/lib/security";
import { updateCollectionPhotos } from "@/server/collections";

export const runtime = "nodejs";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    await updateCollectionPhotos(params.id, await request.json());

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Collection photos update failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}
