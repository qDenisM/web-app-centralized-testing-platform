import { getAccessToken } from "@/lib/session";
import { getApplicantUrl } from "@/lib/applicant";

type ErrorBody = {
  error?: string;
};

export async function applicantFetch<T>(
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

  let res: Response;
  try {
    res = await fetch(`${getApplicantUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      status: 503,
      error: "applicant-service недоступен. Запустите npm run dev:services",
    };
  }

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
      error: errBody?.error || text || "Ошибка applicant-service",
    };
  }

  return { ok: true, status: res.status, data: parsed as T };
}
