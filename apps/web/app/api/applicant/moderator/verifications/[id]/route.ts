import { NextResponse } from "next/server";
import { applicantFetch } from "@/lib/applicant-api";
import type { ModeratorVerificationItem } from "@/lib/moderator";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await applicantFetch<ModeratorVerificationItem>(
    `/moderator/verifications/${id}`,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
