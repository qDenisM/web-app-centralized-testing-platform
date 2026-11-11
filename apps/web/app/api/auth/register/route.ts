import { NextResponse } from "next/server";
import { identityPost } from "@/lib/api";
import {
  homePathForRole,
  setAuthCookies,
  type LoginPayload,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; fullName?: string };

  try {
    body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
    };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const fullName = body.fullName?.trim();

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: "Укажите ФИО, email и пароль" },
      { status: 400 },
    );
  }

  const result = await identityPost<LoginPayload>("/auth/register", {
    email,
    password,
    fullName,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { user, tokens } = result.data;
  const res = NextResponse.json(
    {
      user,
      homePath: homePathForRole(user.role),
    },
    { status: 201 },
  );

  setAuthCookies(res, tokens, user.role);
  return res;
}
