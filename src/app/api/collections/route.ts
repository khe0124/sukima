import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth";
import { assertSameOriginRequest, getApiErrorStatus } from "@/lib/security";
import { createCollection, getCollections } from "@/server/collections";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ items: await getCollections() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Collection list failed.";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized." ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    const collection = await createCollection(await request.json());

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Collection creation failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}
