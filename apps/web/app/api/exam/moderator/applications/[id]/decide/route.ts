import { NextResponse } from "next/server";
import { examFetch } from "@/lib/exam-api";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await examFetch(`/moderator/applications/${id}/decide`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
