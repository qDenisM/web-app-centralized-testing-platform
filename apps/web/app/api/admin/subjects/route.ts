import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";
import type { Subject } from "@/lib/admin";

export async function GET() {
  const result = await catalogFetch<Subject[]>("/admin/subjects");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await catalogFetch<Subject>("/admin/subjects", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}
