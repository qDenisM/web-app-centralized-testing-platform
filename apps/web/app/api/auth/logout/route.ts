import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { identityPost } from "@/lib/api";
import { REFRESH_COOKIE, clearAuthCookies } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    // Даже если identity недоступен — cookies всё равно чистим.
    await identityPost("/auth/logout", { refreshToken }).catch(() => null);
  }

  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
