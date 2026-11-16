import { NextResponse } from "next/server";
import { identityFetch } from "@/lib/identity-api";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const result = await identityFetch(`/users/${id}/block`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}