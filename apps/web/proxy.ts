import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ROLE_COOKIE,
  homePathForRole,
  peekJwtRole,
  roleAllowedOnPath,
} from "@/lib/auth";

const PROTECTED_PREFIXES = ["/app", "/admin", "/moderator", "/examiner"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthPage(pathname: string): boolean {
  return pathname === "/login" || pathname === "/register";
}

/**
 * В Next.js 16 бывший middleware называется proxy.
 * Здесь: гости → /login, авторизованные с auth-страниц → кабинет по роли.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  const roleCookie = request.cookies.get(ROLE_COOKIE)?.value;
  const loggedIn = Boolean(access || refresh);
  const role = roleCookie || peekJwtRole(access);

  if (isProtectedPath(pathname) && !loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage(pathname) && loggedIn) {
    return NextResponse.redirect(
      new URL(homePathForRole(role), request.url),
    );
  }

  if (isProtectedPath(pathname) && loggedIn && role) {
    if (!roleAllowedOnPath(role, pathname)) {
      return NextResponse.redirect(new URL(homePathForRole(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/app/:path*",
    "/admin/:path*",
    "/moderator/:path*",
    "/examiner/:path*",
  ],
};
