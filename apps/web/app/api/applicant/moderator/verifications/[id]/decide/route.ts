import { NextResponse } from "next/server";
import { applicantFetch } from "@/lib/applicant-api";
import type { ModeratorVerificationItem } from "@/lib/moderator";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const result = await applicantFetch<ModeratorVerificationItem>(
    `/moderator/verifications/${id}/decide`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
