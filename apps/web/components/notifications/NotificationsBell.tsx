"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatNotificationTime } from "@/lib/notification";
import { useNotifications } from "@/lib/use-notifications";
import { cn } from "@/lib/utils";

type NotificationsBellProps = {
  allHref?: string;
};

export function NotificationsBell({
  allHref = "/app/notifications",
}: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { items, loading, load, markRead, markAllRead, unreadCount } =
    useNotifications();

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const preview = items.slice(0, 5);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        title="Уведомления"
        aria-label="Уведомления"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load({ silent: true });
        }}
        className="relative rounded-[8px] p-2 text-text-secondary transition-colors hover:bg-[#f4f7f9] hover:text-brand-900"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#c94343] ring-2 ring-white" />
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-[12px] border border-border bg-white p-3 shadow-[0_12px_28px_-4px_rgba(11,58,74,0.12),0_4px_12px_-2px_rgba(11,58,74,0.04)]">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-brand-900">
              Уведомления{unreadCount ? ` (${unreadCount})` : ""}
            </span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[11px] font-bold text-brand-700 hover:underline"
              >
                Прочитать все
              </button>
            ) : null}
          </div>

          {loading && items.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">Загрузка…</p>
          ) : preview.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">
              Пока нет уведомлений
            </p>
          ) : (
            <div className="space-y-2">
              {preview.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!item.isRead) void markRead(item.id);
                  }}
                  className={cn(
                    "flex w-full gap-2.5 rounded-[8px] border p-2.5 text-left text-xs",
                    item.isRead
                      ? "border-border bg-white"
                      : "border-[#1f8a58]/20 bg-[#e4f6ec]",
                  )}
                >
                  <span className="mt-0.5 shrink-0 text-brand-800">●</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-brand-900">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-text-secondary">
                      {item.body}
                    </span>
                    <span className="mt-1 block text-[10px] text-text-muted">
                      {formatNotificationTime(item.createdAt)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <Link
            href={allHref}
            onClick={() => setOpen(false)}
            className="mt-3 block rounded-[8px] px-2 py-2 text-center text-xs font-bold text-brand-700 hover:bg-[#f4f7f9]"
          >
            Все уведомления
          </Link>
        </div>
      ) : null}
    </div>
  );
}
