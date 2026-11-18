import { NextResponse } from "next/server";
import { examFetch } from "@/lib/exam-api";

type LookupResponse = {
  users: Array<{ id: string; email: string; fullName: string }>;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await examFetch<LookupResponse>("/examiner/users/lookup", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
