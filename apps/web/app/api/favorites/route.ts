import { NextResponse } from "next/server";
import { chancesFetch } from "@/lib/chances-api";
import type { Favorite } from "@/lib/chances";

export async function GET() {
  const result = await chancesFetch<Favorite[]>("/favorites");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.specialtyId !== "string") {
    return NextResponse.json(
      { error: "Нужен specialtyId" },
      { status: 400 },
    );
  }

  const result = await chancesFetch<Favorite>("/favorites", {
    method: "POST",
    body: JSON.stringify({ specialtyId: body.specialtyId }),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}