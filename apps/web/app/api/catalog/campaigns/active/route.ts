import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function GET() {
  const result = await catalogFetch("/campaigns/active");
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: noStoreHeaders },
    );
  }
  return NextResponse.json(result.data, { headers: noStoreHeaders });
}
