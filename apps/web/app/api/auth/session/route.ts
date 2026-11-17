import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

/** Lightweight auth probe for cabinet layouts. */
export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
