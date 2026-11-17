import { cookies } from "next/headers";
import { identityPost } from "@/lib/api";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE_SEC,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SEC,
  ROLE_COOKIE,
  type LoginPayload,
} from "@/lib/auth";

function decodeBase64Url(value: string): string {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

function isAccessExpired(token: string): boolean {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split(".")[1] || "")) as {
      exp?: unknown;
    };
    if (typeof payload.exp !== "number") return false;
    // Refresh a bit early to avoid edge races.
    return payload.exp * 1000 <= Date.now() + 15_000;
  } catch {
    return true;
  }
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Returns a usable access token, refreshing via refresh_token when needed.
 * Sets updated cookies when called from a Route Handler / Server Action.
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_COOKIE)?.value;
  if (access && !isAccessExpired(access)) {
    return access;
  }

  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return null;
  }

  const result = await identityPost<LoginPayload>("/auth/refresh", {
    refreshToken,
  });
  if (!result.ok) {
    return null;
  }

  const { user, tokens } = result.data;
  const common = {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
  };

  try {
    cookieStore.set(ACCESS_COOKIE, tokens.accessToken, {
      ...common,
      maxAge: tokens.expiresIn || ACCESS_MAX_AGE_SEC,
    });
    cookieStore.set(REFRESH_COOKIE, tokens.refreshToken, {
      ...common,
      maxAge: REFRESH_MAX_AGE_SEC,
    });
    cookieStore.set(ROLE_COOKIE, user.role, {
      ...common,
      maxAge: REFRESH_MAX_AGE_SEC,
    });
  } catch {
    // Cookie mutation may be unavailable outside Route Handlers; token still usable for this request.
  }

  return tokens.accessToken;
}
