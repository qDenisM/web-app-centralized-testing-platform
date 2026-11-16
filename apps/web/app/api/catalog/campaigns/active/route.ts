import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";

export async function GET() {
  const result = await catalogFetch("/campaigns/active");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
