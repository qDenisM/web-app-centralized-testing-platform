import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";

type Params = { params: Promise<{ specialtyId: string; scoreId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { specialtyId, scoreId } = await params;
  const result = await catalogFetch(
    `/admin/specialties/${specialtyId}/passing-scores/${scoreId}`,
    { method: "DELETE" },
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return new NextResponse(null, { status: 204 });
}