import { NextResponse } from "next/server";
import { examFetch } from "@/lib/exam-api";
import type { ExamApplication } from "@/lib/exam";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const path = qs ? `/examiner/applications?${qs}` : "/examiner/applications";
  const result = await examFetch<{ items: ExamApplication[] }>(path);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}