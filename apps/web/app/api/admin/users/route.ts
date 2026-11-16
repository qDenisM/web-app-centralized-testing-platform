import { NextResponse } from "next/server";
import { identityFetch } from "@/lib/identity-api";
import type { AdminUser } from "@/lib/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qs = new URLSearchParams();
  const q = url.searchParams.get("q");
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  if (q) qs.set("q", q);
  if (role) qs.set("role", role);
  if (status) qs.set("status", status);

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = await identityFetch<{ items: AdminUser[] }>(`/admin/users${suffix}`);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}