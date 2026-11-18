import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success" | "warning" | "info";

type AlertProps = {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
  /** Tighter padding for forms/modals */
  compact?: boolean;
};

const variants: Record<AlertVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-border bg-[#f4f7f9] text-text-secondary",
};

export function Alert({
  children,
  variant = "error",
  className,
  compact = false,
}: AlertProps) {
  return (
    <p
      className={cn(
        "rounded-[10px] border text-sm",
        compact ? "px-3 py-2" : "px-4 py-3",
        variants[variant],
        className,
      )}
    >
      {children}
    </p>
  );
}
