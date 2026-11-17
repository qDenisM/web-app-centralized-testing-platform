import { NextResponse } from "next/server";
import { examFetch } from "@/lib/exam-api";
import {
  canApplyToCt,
  getSystemSettings,
} from "@/lib/system-settings-guard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const system = await getSystemSettings();
  if (!canApplyToCt(system)) {
    return NextResponse.json(
      {
        error: system?.maintenanceMode
          ? "Запись на ЦТ недоступна: ведутся технические работы"
          : "Запись на ЦТ временно закрыта администратором",
      },
      { status: 403 },
    );
  }

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
