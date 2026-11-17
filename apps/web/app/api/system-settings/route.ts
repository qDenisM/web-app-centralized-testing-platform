import { NextResponse } from "next/server";
import { catalogPublicGet } from "@/lib/catalog-api";
import type { SystemSettings } from "@/lib/system-settings";

export async function GET() {
  const result = await catalogPublicGet<SystemSettings>("/system-settings");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "no-store" },
  });
}
