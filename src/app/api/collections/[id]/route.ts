import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth";
import { assertSameOriginRequest, getApiErrorStatus } from "@/lib/security";
import { deleteCollection, updateCollection } from "@/server/collections";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    const collection = await updateCollection(params.id, await request.json());

    return NextResponse.json(collection);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Collection update failed.";
    const status = message === "Collection not found." ? 404 : getApiErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    await deleteCollection(params.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Collection delete failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}
