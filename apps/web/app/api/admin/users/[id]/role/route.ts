import { NextResponse } from "next/server";
import { identityFetch } from "@/lib/identity-api";
import type { AdminUser } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const result = await identityFetch<AdminUser>(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}