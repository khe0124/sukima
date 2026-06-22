import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { assertSameOriginRequest, getApiErrorStatus } from "@/lib/security";
import { processPhoto } from "@/server/photos";

export const runtime = "nodejs";
// 원본 + 모든 asset에 대한 sharp 처리가 기본 함수 타임아웃(10s)을 넘길 수 있어 상향한다.
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    assertSameOriginRequest(request);
    const result = await processPhoto(params.id);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo processing failed.";
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}
