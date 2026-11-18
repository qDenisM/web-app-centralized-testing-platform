"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  cachedFetch,
  peekCache,
  setCacheData,
  subscribeCache,
} from "@/lib/client-cache";
import type { AppNotification } from "@/lib/notification";
import { SHELL_KEYS } from "@/lib/shell-data";

const POLL_INTERVAL_MS = 20_000;
const TTL_MS = 15_000;

type UseNotificationsOptions = {
  /** When false, skips fetch (e.g. dropdown closed + still poll for badge). */
  enabled?: boolean;
};

async function fetchNotifications(force = false): Promise<AppNotification[]> {
  return cachedFetch(
    SHELL_KEYS.notifications,
    async () => {
      const res = await fetch("/api/notifications/me", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as
        | AppNotification[]
        | { error?: string };
      if (!res.ok || !Array.isArray(json)) {
        throw new Error(
          !Array.isArray(json) && json.error
            ? json.error
            : "Не удалось загрузить уведомления",
        );
      }
      return json;
    },
    { force, ttlMs: TTL_MS },
  );
}

/**
 * Loads `/api/notifications/me` once (shared shell cache), then refreshes
 * on an interval, window focus, and tab visibility.
 * Bell + list share one in-flight request and one cache entry.
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const enabled = options.enabled ?? true;
  const cached = useSyncExternalStore(
    (onStoreChange) => subscribeCache(SHELL_KEYS.notifications, onStoreChange),
    () => peekCache<AppNotification[]>(SHELL_KEYS.notifications),
    () => undefined,
  );
  const [items, setItems] = useState<AppNotification[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    const silent = opts?.silent === true && (peekCache(SHELL_KEYS.notifications) !== undefined);
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const next = await fetchNotifications(opts?.force === true);
      setItems(next);
      setError(null);
    } catch (err) {
      if (!silent) {
        setItems([]);
        setError(
          err instanceof Error
            ? err.message
            : "Сеть недоступна. Проверьте notification-service.",
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cached !== undefined) {
      setItems(cached);
      setLoading(false);
    }
  }, [cached]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      void load({ silent: true, force: true });
    }, POLL_INTERVAL_MS);

    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        void load({ silent: true, force: true });
      }
    }

    function onFocus() {
      void load({ silent: true, force: true });
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [enabled, load]);

  const markRead = useCallback(async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    if (!res.ok) return;
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      );
      setCacheData(SHELL_KEYS.notifications, next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = items.filter((item) => !item.isRead).map((item) => item.id);
    if (unreadIds.length === 0) return;
    await Promise.all(
      unreadIds.map((id) =>
        fetch(`/api/notifications/${id}/read`, { method: "POST" }),
      ),
    );
    setItems((prev) => {
      const next = prev.map((item) => ({ ...item, isRead: true }));
      setCacheData(SHELL_KEYS.notifications, next);
      return next;
    });
  }, [items]);

  return {
    items,
    loading,
    error,
    load,
    markRead,
    markAllRead,
    unreadCount: items.filter((item) => !item.isRead).length,
  };
}
