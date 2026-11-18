"use client";

import { formatNotificationTime } from "@/lib/notification";
import { useNotifications } from "@/lib/use-notifications";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

export function NotificationsList() {
  const { items, loading, error, markRead, markAllRead, unreadCount } =
    useNotifications();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
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

      {loading && items.length === 0 ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : error && items.length === 0 ? (
        <Alert className="border-[#c94343]/30 bg-[#fdecec] text-[#8a2a2a]">
          {error}
        </Alert>
      ) : items.length === 0 ? (
        <EmptyState className="flex min-h-[280px] flex-1 items-center justify-center border-solid p-6 text-text-secondary">
          Пока нет уведомлений.
        </EmptyState>
      ) : (
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto">
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
