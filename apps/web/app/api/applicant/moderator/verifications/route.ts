import { NextResponse } from "next/server";
import { applicantFetch } from "@/lib/applicant-api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";
  const q = url.searchParams.get("q") || "";

  const qs = new URLSearchParams({ status });
  if (q) qs.set("q", q);

  const result = await applicantFetch<{
    items: unknown[];
    counts: Record<string, number>;
  }>(`/moderator/verifications?${qs.toString()}`);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
