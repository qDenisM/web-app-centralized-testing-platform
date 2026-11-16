import { NextResponse } from "next/server";
import { examFetch } from "@/lib/exam-api";
import type { ExamSession } from "@/lib/exam";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const path = qs ? `/exams?${qs}` : "/exams";
  const result = await examFetch<ExamSession[]>(path);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
