import { NextResponse } from "next/server";
import { resultsFetch } from "@/lib/results-api";
import type { ExaminerResultsResponse } from "@/lib/results";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const path = qs ? `/examiner/results?${qs}` : "/examiner/results";
  const result = await resultsFetch<ExaminerResultsResponse>(path);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}