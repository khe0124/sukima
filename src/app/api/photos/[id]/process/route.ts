import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { processPhoto } from "@/server/photos";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const result = await processPhoto(params.id);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo processing failed.";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized." ? 401 : 500 });
  }
}
