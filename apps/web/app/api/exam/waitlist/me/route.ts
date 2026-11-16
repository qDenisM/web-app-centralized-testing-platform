import { NextResponse } from "next/server";
import { examFetch } from "@/lib/exam-api";
import type { ExamWaitlistEntry } from "@/lib/exam";

export async function GET() {
  const result = await examFetch<ExamWaitlistEntry[]>("/waitlist/me");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
