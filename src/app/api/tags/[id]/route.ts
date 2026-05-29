import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth";
import { assertSameOriginRequest, getApiErrorStatus } from "@/lib/security";
import { deleteTag, updateTag } from "@/server/tags";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    const tag = await updateTag(params.id, await request.json());

    return NextResponse.json(tag);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Tag update failed.";
    const status = message === "Tag not found." ? 404 : getApiErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    await deleteTag(params.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tag delete failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}
