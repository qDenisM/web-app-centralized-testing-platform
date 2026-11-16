import { NextResponse } from "next/server";
import { resultsFetch } from "@/lib/results-api";
import type { CtResult } from "@/lib/results";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await resultsFetch<CtResult>(`/examiner/results/${id}/publish`, {
    method: "POST",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}