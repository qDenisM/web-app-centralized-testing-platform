export function getIdentityUrl(): string {
  return process.env.IDENTITY_URL?.replace(/\/$/, "") || "http://localhost:3001";
}

type IdentityErrorBody = {
  error?: string;
  code?: string;
};

export async function identityPost<T>(
  path: string,
  body: unknown,
): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: string }> {
  const res = await fetch(`${getIdentityUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
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
    const errBody = parsed as IdentityErrorBody | null;
    return {
      ok: false,
      status: res.status,
      error: errBody?.error || text || "Ошибка identity-service",
    };
  }

  return { ok: true, status: res.status, data: parsed as T };
}
