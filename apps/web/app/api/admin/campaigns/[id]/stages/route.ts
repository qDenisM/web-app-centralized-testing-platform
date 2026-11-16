import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";
import type { CampaignStage } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await catalogFetch<CampaignStage>(`/admin/campaigns/${id}/stages`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}