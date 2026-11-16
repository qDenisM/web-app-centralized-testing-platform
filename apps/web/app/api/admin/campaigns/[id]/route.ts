import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";
import type { Campaign } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await catalogFetch<Campaign>(`/admin/campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const result = await catalogFetch(`/admin/campaigns/${id}`, { method: "DELETE" });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return new NextResponse(null, { status: 204 });
}