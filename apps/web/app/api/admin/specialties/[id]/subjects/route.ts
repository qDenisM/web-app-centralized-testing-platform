import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";
import type { Specialty } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await catalogFetch<Specialty>(`/admin/specialties/${id}/subjects`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await catalogFetch<Specialty>(`/admin/specialties/${id}/subjects`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}
