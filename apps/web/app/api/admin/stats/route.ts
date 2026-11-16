import { NextResponse } from "next/server";
import { catalogFetch } from "@/lib/catalog-api";
import { identityFetch } from "@/lib/identity-api";
import type { CatalogAdminStats, IdentityAdminStats } from "@/lib/admin";

export async function GET() {
  const [identity, catalog] = await Promise.all([
    identityFetch<IdentityAdminStats>("/admin/stats"),
    catalogFetch<CatalogAdminStats>("/admin/stats"),
  ]);

  if (!identity.ok) {
    return NextResponse.json({ error: identity.error }, { status: identity.status });
  }
  if (!catalog.ok) {
    return NextResponse.json({ error: catalog.error }, { status: catalog.status });
  }

  return NextResponse.json({
    identity: identity.data,
    catalog: catalog.data,
  });
}