import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/lib/auth";
import { assertSameOriginRequest, getApiErrorStatus } from "@/lib/security";
import { createPhoto, getPhotos } from "@/server/photos";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    const body = await request.json();
    const photo = await createPhoto(body);

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Photo creation failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const includePrivate = searchParams.get("admin") === "1";

    if (includePrivate) {
      await requireAdmin(request);
    }

    const photos = await getPhotos({
      limit: searchParams.get("limit"),
      page: searchParams.get("page"),
      includePrivate,
      tag: searchParams.get("tag"),
      search: searchParams.get("search"),
      status: searchParams.get("status"),
      visibility: searchParams.get("visibility"),
      sort: searchParams.get("sort")
    });

    return NextResponse.json(photos);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo list failed.";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized." ? 401 : 500 });
  }
}
