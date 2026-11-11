import type { NextResponse } from "next/server";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
export const ROLE_COOKIE = "auth_role";

/** Как в identity-service по умолчанию. */
export const ACCESS_MAX_AGE_SEC = 15 * 60;
export const REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type LoginPayload = {
  user: AuthUser;
  tokens: AuthTokens;
};

export function homePathForRole(role: string | undefined | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "moderator":
      return "/moderator";
    case "examiner":
      return "/examiner";
    case "applicant":
    default:
      return "/app";
  }
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Кладём токены в httpOnly cookies (браузер JS их не видит). */
export function setAuthCookies(
  res: NextResponse,
  tokens: AuthTokens,
  role: string,
): void {
  const common = {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
  };

  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...common,
    maxAge: tokens.expiresIn || ACCESS_MAX_AGE_SEC,
  });

  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...common,
    maxAge: REFRESH_MAX_AGE_SEC,
  });

  // Роль нужна proxy для редиректов; не секрет, но тоже httpOnly.
  res.cookies.set(ROLE_COOKIE, role, {
    ...common,
    maxAge: REFRESH_MAX_AGE_SEC,
  });
}

export function clearAuthCookies(res: NextResponse): void {
  const common = {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  res.cookies.set(ACCESS_COOKIE, "", common);
  res.cookies.set(REFRESH_COOKIE, "", common);
  res.cookies.set(ROLE_COOKIE, "", common);
}

function decodeBase64Url(value: string): string {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  // atob — чтобы работало и в Edge (proxy), и в Node.
  return atob(b64);
}

/** Грубый разбор payload JWT без проверки подписи (только для UI-редиректов). */
export function peekJwtRole(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const json = decodeBase64Url(parts[1]);
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function roleAllowedOnPath(role: string | null, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "admin";
  }
  if (pathname.startsWith("/moderator")) {
    return role === "moderator" || role === "admin";
  }
  if (pathname.startsWith("/examiner")) {
    return role === "examiner" || role === "admin";
  }
  if (pathname.startsWith("/app")) {
    return role === "applicant" || role === "admin";
  }
  return true;
}
