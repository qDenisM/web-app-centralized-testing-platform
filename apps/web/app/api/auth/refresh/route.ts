import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { identityPost } from "@/lib/api";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  type LoginPayload,
} from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    const res = NextResponse.json(
      { error: "Нет refresh-токена" },
      { status: 401 },
    );
    clearAuthCookies(res);
    return res;
  }

  const result = await identityPost<LoginPayload>("/auth/refresh", {
    refreshToken,
  });

  if (!result.ok) {
    const res = NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
    clearAuthCookies(res);
    return res;
  }

  const { user, tokens } = result.data;
  const res = NextResponse.json({ user });
  setAuthCookies(res, tokens, user.role);
  return res;
}
