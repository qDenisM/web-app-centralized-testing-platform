import { NextResponse } from "next/server";
import { examFetch } from "@/lib/exam-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await examFetch<{
    type: string;
    application?: unknown;
    waitlist?: unknown;
  }>(`/exams/${id}/apply`, { method: "POST" });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}
