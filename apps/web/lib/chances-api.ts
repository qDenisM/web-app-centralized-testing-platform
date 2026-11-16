import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth";
import { getChancesUrl } from "@/lib/chances";

type ErrorBody = {
  error?: string;
};

export async function chancesFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<
  { ok: true; status: number; data: T } | { ok: false; status: number; error: string }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) {
    return { ok: false, status: 401, error: "Нужна авторизация" };
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getChancesUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (res.status === 204) {
    return { ok: true, status: 204, data: undefined as T };
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const errBody = parsed as ErrorBody | null;
    return {
      ok: false,
      status: res.status,
      error: errBody?.error || text || "Ошибка chances-service",
    };
  }

  return { ok: true, status: res.status, data: parsed as T };
}