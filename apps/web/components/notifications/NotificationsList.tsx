"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatNotificationTime,
  type AppNotification,
} from "@/lib/notification";
import { cn } from "@/lib/utils";

export function NotificationsList() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/me");
      const json = (await res.json().catch(() => ({}))) as
        | AppNotification[]
        | { error?: string };
      if (!res.ok || !Array.isArray(json)) {
        setError(
          !Array.isArray(json) && json.error
            ? json.error
            : "Не удалось загрузить уведомления",
        );
        return;
      }
      setItems(json);
    } catch {
      setError("Сеть недоступна. Проверьте notification-service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    if (!res.ok) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
  }

  async function markAllRead() {
    const unreadIds = items.filter((item) => !item.isRead).map((item) => item.id);
    await Promise.all(
      unreadIds.map((id) =>
        fetch(`/api/notifications/${id}/read`, { method: "POST" }),
      ),
    );
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
  }

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Уведомления
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Сообщения о проверке анкеты и других событиях.
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex rounded-[10px] border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-secondary shadow-[var(--shadow-soft)] hover:bg-[#f8fafc]"
          >
            Прочитать все ({unreadCount})
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : error ? (
        <p className="rounded-[12px] border border-[#c94343]/30 bg-[#fdecec] px-4 py-3 text-sm text-[#8a2a2a]">
          {error}
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
          Пока нет уведомлений.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  if (!item.isRead) void markRead(item.id);
                }}
                className={cn(
                  "w-full rounded-[14px] border p-4 text-left shadow-[var(--shadow-soft)] transition-colors",
                  item.isRead
                    ? "border-border bg-white"
                    : "border-brand-100 bg-brand-100/40 hover:bg-brand-100/70",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-extrabold text-brand-900">
                    {item.title}
                  </p>
                  <span className="text-xs text-text-muted">
                    {formatNotificationTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  {item.body}
                </p>
                {!item.isRead ? (
                  <span className="mt-2 inline-block text-xs font-bold text-brand-700">
                    Новое
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
