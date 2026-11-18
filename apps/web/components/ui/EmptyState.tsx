import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
  /** Soft bordered box (default) vs plain muted text */
  boxed?: boolean;
};

export function EmptyState({
  children,
  className,
  boxed = true,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "text-sm text-text-muted",
        boxed &&
          "rounded-[14px] border border-dashed border-border bg-white px-4 py-8 text-center shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
