import { NextResponse } from "next/server";
import { chancesFetch } from "@/lib/chances-api";
import type { ChanceResult } from "@/lib/chances";

export async function GET() {
  const result = await chancesFetch<ChanceResult[]>("/chances/me");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}