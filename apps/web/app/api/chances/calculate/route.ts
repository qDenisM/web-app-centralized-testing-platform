import { NextResponse } from "next/server";
import { chancesFetch } from "@/lib/chances-api";
import type { ChanceResult } from "@/lib/chances";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await chancesFetch<ChanceResult[]>("/chances/calculate", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}