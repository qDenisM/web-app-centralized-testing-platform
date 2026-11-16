import { NextResponse } from "next/server";
import { notificationFetch } from "@/lib/notification-api";
import type { AppNotification } from "@/lib/notification";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await notificationFetch<AppNotification>(
    `/notifications/${id}/read`,
    { method: "POST" },
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
