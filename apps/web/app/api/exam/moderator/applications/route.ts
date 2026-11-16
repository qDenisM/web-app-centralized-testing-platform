import { NextResponse } from "next/server";
import { examFetch } from "@/lib/exam-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const path = qs ? `/moderator/applications?${qs}` : "/moderator/applications";
  const result = await examFetch(path);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await examFetch("/moderator/applications/approve-batch", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
