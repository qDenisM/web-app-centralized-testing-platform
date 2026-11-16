import { NextResponse } from "next/server";
import { applicantFetch } from "@/lib/applicant-api";
import type { OcrAttestatResponse } from "@/lib/applicant";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const result = await applicantFetch<OcrAttestatResponse>(
    "/profile/me/attestat/ocr",
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
