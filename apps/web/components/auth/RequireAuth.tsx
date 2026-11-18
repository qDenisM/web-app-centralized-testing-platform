"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Ensures cabinet pages have a session. Redirects to /login instead of
 * rendering "Нужна авторизация" on dashboards.
 *
 * Runs once per shell mount (layout). Re-checking on every pathname change
 * added a fetch waterfall on each nav click without changing UX (ready stayed true).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
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

        const next = encodeURIComponent(pathnameRef.current || "/app");
        router.replace(`/login?next=${next}`);
      } catch {
        if (!cancelled) {
          const next = encodeURIComponent(pathnameRef.current || "/app");
          router.replace(`/login?next=${next}`);
        }
      }
    }

    void ensureSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-text-muted">
        Проверка сессии…
      </div>
    );
  }

  return children;
}
