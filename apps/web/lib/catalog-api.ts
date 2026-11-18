import { getAccessToken } from "@/lib/session";
import { getCatalogUrl } from "@/lib/catalog";

type ErrorBody = {
  error?: string;
};

export async function catalogFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<
  { ok: true; status: number; data: T } | { ok: false; status: number; error: string }
> {
  const token = await getAccessToken();

  if (!token) {
    return { ok: false, status: 401, error: "Нужна авторизация" };
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getCatalogUrl()}${path}`, {
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
      error: errBody?.error || text || "Ошибка catalog-service",
    };
  }

  return { ok: true, status: res.status, data: parsed as T };
}

/** Subjects / specialties / institutions — safe to cache briefly. */
const PUBLIC_CATALOG_REVALIDATE_SECONDS = 60;

export async function catalogPublicGet<T>(path: string): Promise<
  { ok: true; data: T } | { ok: false; error: string }
> {
  const res = await fetch(`${getCatalogUrl()}${path}`, {
    next: { revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
  });

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
      error: errBody?.error || text || "Ошибка catalog-service",
    };
  }

  return { ok: true, data: parsed as T };
}