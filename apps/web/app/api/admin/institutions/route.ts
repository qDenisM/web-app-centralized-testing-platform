import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";
import type { Institution } from "@/lib/admin";

export async function GET() {
  const result = await catalogFetch<Institution[]>("/admin/institutions");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await catalogFetch<Institution>("/admin/institutions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}