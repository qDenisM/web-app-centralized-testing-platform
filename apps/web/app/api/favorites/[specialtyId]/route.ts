import { NextResponse } from "next/server";
import { chancesFetch } from "@/lib/chances-api";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ specialtyId: string }> },
) {
  const { specialtyId } = await ctx.params;
  const result = await chancesFetch<void>(`/favorites/${specialtyId}`, {
    method: "DELETE",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return new NextResponse(null, { status: 204 });
}