import { NextResponse } from "next/server";
import { notificationFetch } from "@/lib/notification-api";
import type { AppNotification } from "@/lib/notification";

export async function GET() {
  const result = await notificationFetch<AppNotification[]>("/notifications/me");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
