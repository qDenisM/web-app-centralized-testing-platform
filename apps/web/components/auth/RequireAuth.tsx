"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Ensures cabinet pages have a session. Redirects to /login instead of
 * rendering "Нужна авторизация" on dashboards.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      try {
        const probe = await fetch("/api/auth/session", { cache: "no-store" });
        if (cancelled) return;
        if (probe.ok) {
          setReady(true);
          return;
        }

        const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
        if (cancelled) return;
        if (refreshed.ok) {
          setReady(true);
          return;
        }

        const next = encodeURIComponent(pathname || "/app");
        router.replace(`/login?next=${next}`);
      } catch {
        if (!cancelled) {
          const next = encodeURIComponent(pathname || "/app");
          router.replace(`/login?next=${next}`);
        }
      }
    }

    void ensureSession();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-text-muted">
        Проверка сессии…
      </div>
    );
  }

  return children;
}
