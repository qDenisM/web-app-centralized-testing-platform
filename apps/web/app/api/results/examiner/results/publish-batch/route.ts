import { NextResponse } from "next/server";
import { resultsFetch } from "@/lib/results-api";
import type { CtResult } from "@/lib/results";

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const result = await resultsFetch<{ items: CtResult[]; count: number }>(
    "/examiner/results/publish-batch",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}