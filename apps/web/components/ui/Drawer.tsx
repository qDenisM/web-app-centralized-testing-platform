"use client";

import { useEffect, type ReactNode } from "react";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  widthClassName = "max-w-md",
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const unlock = lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-[#0b3a4a]/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={cn(
          "relative z-10 flex h-full w-full flex-col bg-white pointer-events-auto shadow-[-12px_0_40px_rgba(11,58,74,0.12)]",
          widthClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="drawer-title" className="text-lg font-extrabold text-brand-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-text-muted hover:bg-[#f4f7f9]"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-[#f8fafc] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
