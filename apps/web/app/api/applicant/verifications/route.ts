import { NextResponse } from "next/server";
import { applicantFetch } from "@/lib/applicant-api";
import type { VerificationHistoryList } from "@/lib/applicant";

export async function GET() {
  const result = await applicantFetch<VerificationHistoryList>(
    "/profile/me/verifications",
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
