import { NextResponse } from "next/server";
import { catalogPublicGet } from "@/lib/catalog-api";
import type { CatalogSubject } from "@/lib/catalog";

const cacheHeaders = {
  // Rarely changing reference data — browser/CDN may reuse briefly.
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET() {
  const result = await catalogPublicGet<CatalogSubject[]>("/subjects");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json(result.data, { headers: cacheHeaders });
}
