import { NextResponse } from "next/server";
import { identityPost } from "@/lib/api";
import {
  homePathForRole,
  setAuthCookies,
  type LoginPayload,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };

  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Укажите email и пароль" },
      { status: 400 },
    );
  }

  const result = await identityPost<LoginPayload>("/auth/login", {
    email,
    password,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { user, tokens } = result.data;
  const res = NextResponse.json({
    user,
    homePath: homePathForRole(user.role),
  });

  setAuthCookies(res, tokens, user.role);
  return res;
}
