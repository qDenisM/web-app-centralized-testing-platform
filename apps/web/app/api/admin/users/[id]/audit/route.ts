import { NextResponse } from "next/server";
import { identityFetch } from "@/lib/identity-api";
import type { UserAuditLogResponse } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const result = await identityFetch<UserAuditLogResponse>(
    `/admin/users/${id}/audit`,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}