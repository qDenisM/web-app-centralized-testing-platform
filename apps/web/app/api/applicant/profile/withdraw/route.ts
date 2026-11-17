import { NextResponse } from "next/server";
import { applicantFetch } from "@/lib/applicant-api";
import type { ApplicantProfile } from "@/lib/applicant";

export async function POST() {
  const result = await applicantFetch<ApplicantProfile>("/profile/me/withdraw", {
    method: "POST",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
