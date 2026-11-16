import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";

type Params = { params: Promise<{ id: string; scoreId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id, scoreId } = await params;
  const result = await catalogFetch(
    `/admin/specialties/${id}/passing-scores/${scoreId}`,
    { method: "DELETE" },
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return new NextResponse(null, { status: 204 });
}
