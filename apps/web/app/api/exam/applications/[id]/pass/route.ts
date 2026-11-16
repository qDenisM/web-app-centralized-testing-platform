import { NextResponse } from "next/server";
import { examFetch } from "@/lib/exam-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await examFetch<{
    passNumber: string | null;
    storageKey: string;
    downloadUrl: string;
    expiresIn: number;
  }>(`/applications/${id}/pass`);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
