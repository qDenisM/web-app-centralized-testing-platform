import { NextResponse } from "next/server";
import { resultsFetch } from "@/lib/results-api";
import type { CtResult } from "@/lib/results";

export async function GET() {
  const result = await resultsFetch<CtResult[]>("/results/me");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
