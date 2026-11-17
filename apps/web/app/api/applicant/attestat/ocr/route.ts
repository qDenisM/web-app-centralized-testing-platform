import { NextResponse } from "next/server";
import { applicantFetch } from "@/lib/applicant-api";
import type { OcrAttestatResponse } from "@/lib/applicant";
import {
  canUseOcr,
  getSystemSettings,
} from "@/lib/system-settings-guard";

export async function POST(request: Request) {
  const system = await getSystemSettings();
  if (!canUseOcr(system)) {
    return NextResponse.json(
      {
        error: system?.maintenanceMode
          ? "OCR недоступен: ведутся технические работы"
          : "OCR аттестата отключён администратором",
      },
      { status: 403 },
    );
  }

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
