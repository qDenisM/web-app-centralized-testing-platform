import { NextResponse } from "next/server";
import { notificationFetch } from "@/lib/notification-api";
import type { NotificationPreferences } from "@/lib/notification";

export async function GET() {
  const result = await notificationFetch<NotificationPreferences>(
    "/notification-preferences/me",
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await notificationFetch<NotificationPreferences>(
    "/notification-preferences/me",
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
