import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  footer?: ReactNode;
  footerTone?: "muted" | "warn";
  className?: string;
  /** Compact padding for denser grids */
  compact?: boolean;
};

export function KpiCard({
  label,
  value,
  detail,
  footer,
  footerTone = "muted",
  className,
  compact = false,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]",
        compact ? "px-4 py-3" : "p-5",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p
        className={cn(
          "font-black text-brand-900 tabular-nums",
          compact ? "mt-1 text-2xl font-extrabold" : "mt-2 text-3xl",
        )}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-sm text-text-secondary">{detail}</p>
      ) : null}
      {footer ? (
        <p
          className={cn(
            "mt-3 border-t border-border pt-3 text-xs font-semibold",
            footerTone === "warn" ? "text-[#9A6B00]" : "text-text-muted",
          )}
        >
          {footer}
        </p>
      ) : null}
    </div>
  );
}
