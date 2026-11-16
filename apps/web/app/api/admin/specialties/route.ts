import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";
import type { Specialty } from "@/lib/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get("institutionId");
  const suffix = institutionId
    ? `?institutionId=${encodeURIComponent(institutionId)}`
    : "";

  const result = await catalogFetch<Specialty[]>(`/admin/specialties${suffix}`);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await catalogFetch<Specialty>("/admin/specialties", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}