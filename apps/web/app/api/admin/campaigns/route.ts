import { NextResponse } from "next/server";
import { catalogFetch, catalogPublicGet } from "@/lib/catalog-api";
import type { Campaign } from "@/lib/admin";

export async function GET() {
  const result = await catalogPublicGet<Campaign[]>("/campaigns");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await catalogFetch<Campaign>("/admin/campaigns", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}