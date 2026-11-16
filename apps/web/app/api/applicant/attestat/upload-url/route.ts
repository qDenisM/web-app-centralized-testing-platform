import { NextResponse } from "next/server";
import { applicantFetch } from "@/lib/applicant-api";
import type { UploadUrlResponse } from "@/lib/applicant";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const result = await applicantFetch<UploadUrlResponse>(
    "/profile/me/attestat/upload-url",
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
