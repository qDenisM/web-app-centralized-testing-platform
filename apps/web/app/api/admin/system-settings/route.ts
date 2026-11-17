import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";
import type { SystemSettings } from "@/lib/system-settings";

export async function GET() {
  const result = await catalogFetch<SystemSettings>("/admin/system-settings");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await catalogFetch<SystemSettings>("/admin/system-settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
